import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { isExactHttpsOrigin, isReservedSiteOrigin } from "./site-origin.mjs";

const PROJECT = "shouban-prod";
const DIGEST_IMAGE = /^(?:[a-z0-9]+(?:[.-][a-z0-9]+)*(?::[0-9]+)?\/)?[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*@sha256:[a-f0-9]{64}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const NETWORK = /^[a-z0-9][a-z0-9_.-]{0,62}$/i;
const INSPECT = '{"id":{{json .Id}},"state":{{json .State.Status}},"health":{{if .State.Health}}{{json .State.Health.Status}}{{else}}"none"{{end}},"image":{{json .Config.Image}},"user":{{json .Config.User}},"networks":{{json .NetworkSettings.Networks}},"ports":{{json .HostConfig.PortBindings}},"project":{{json (index .Config.Labels "com.docker.compose.project")}},"service":{{json (index .Config.Labels "com.docker.compose.service")}},"readOnly":{{json .HostConfig.ReadonlyRootfs}},"capDrop":{{json .HostConfig.CapDrop}},"securityOpt":{{json .HostConfig.SecurityOpt}},"nanoCpus":{{json .HostConfig.NanoCpus}},"memory":{{json .HostConfig.Memory}},"memorySwap":{{json .HostConfig.MemorySwap}},"pids":{{json .HostConfig.PidsLimit}},"mounts":{{json .Mounts}},"restart":{{json .HostConfig.RestartPolicy.Name}},"logging":{{json .HostConfig.LogConfig}}}';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function ipv4Number(ip) {
  return ip.split(".").reduce((value, part) => value * 256 + Number(part), 0);
}

function inRange(value, first, prefix) {
  const size = 2 ** (32 - prefix);
  return value >= first && value < first + size;
}

const PRIVATE_RANGES = [["10.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16]];
const PROXY_RANGES = [...PRIVATE_RANGES, ["100.64.0.0", 10]];

export function isPrivateBindIp(value) {
  return typeof value === "string" && isIP(value) === 4 &&
    PRIVATE_RANGES.some(([first, prefix]) => inRange(ipv4Number(value), ipv4Number(first), prefix));
}

export function validateTrustedProxyCidrs(value) {
  if (typeof value !== "string" || !value.trim()) fail("DEPLOYMENT_TRUSTED_PROXY_CIDRS_INVALID");
  const entries = value.trim().split(/\s+/);
  if (new Set(entries).size !== entries.length) fail("DEPLOYMENT_TRUSTED_PROXY_CIDRS_INVALID");
  for (const entry of entries) {
    const [ip, prefixText, extra] = entry.split("/");
    const prefix = Number(prefixText);
    if (extra !== undefined || isIP(ip) !== 4 || !/^(?:[1-9]|[12][0-9]|3[0-2])$/.test(prefixText ?? "")) {
      fail("DEPLOYMENT_TRUSTED_PROXY_CIDRS_INVALID");
    }
    const first = ipv4Number(ip);
    const size = 2 ** (32 - prefix);
    if (first % size !== 0 || !PROXY_RANGES.some(([base, bits]) =>
      inRange(first, ipv4Number(base), bits) && inRange(first + size - 1, ipv4Number(base), bits))) {
      fail("DEPLOYMENT_TRUSTED_PROXY_CIDRS_INVALID");
    }
  }
  return entries;
}

function required(env, key) {
  const value = env[key];
  if (typeof value !== "string" || value === "" || value.trim() !== value || /[\0\r\n]/.test(value)) {
    fail("DEPLOYMENT_INPUT_INVALID_" + key);
  }
  return value;
}

function sameKeys(actual, expected) {
  return actual && typeof actual === "object" &&
    JSON.stringify(Object.keys(actual).sort()) === JSON.stringify([...expected].sort());
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
}

const defaultIo = { lstat: lstatSync, read: readFileSync, realpath: realpathSync };

function checkedAncestors(path, io) {
  let directory = dirname(path);
  for (;;) {
    let stat;
    try { stat = io.lstat(directory); } catch { fail("DEPLOYMENT_DIRECTORY_UNREADABLE"); }
    if (stat.isSymbolicLink() || !stat.isDirectory() || (stat.mode & 0o022) !== 0 ||
        (typeof process.getuid === "function" && stat.uid !== 0 && stat.uid !== process.getuid())) fail("DEPLOYMENT_DIRECTORY_PERMISSIONS_UNSAFE");
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
}

function checkedFile(path, root, io, secret = false, expectedSha) {
  if (!isAbsolute(path) || !inside(root, path)) fail("DEPLOYMENT_FILE_OUTSIDE_RELEASE");
  let stat;
  let actualPath;
  let content;
  try {
    stat = io.lstat(path);
    actualPath = io.realpath(path);
  } catch { fail("DEPLOYMENT_FILE_UNREADABLE"); }
  if (stat.isSymbolicLink() || !stat.isFile() || actualPath !== resolve(path) || !inside(root, actualPath)) {
    fail("DEPLOYMENT_FILE_NOT_IMMUTABLE_REGULAR");
  }
  if (stat.nlink !== 1 || stat.size < 0 || stat.size > 1024 * 1024) fail("DEPLOYMENT_FILE_LINK_OR_SIZE_INVALID");
  if ((stat.mode & (secret ? 0o077 : 0o022)) !== 0 ||
      (typeof process.getuid === "function" && stat.uid !== 0 && stat.uid !== process.getuid())) {
    fail("DEPLOYMENT_FILE_PERMISSIONS_UNSAFE");
  }
  checkedAncestors(path, io);
  try { content = io.read(path); } catch { fail("DEPLOYMENT_FILE_UNREADABLE"); }
  if (expectedSha && createHash("sha256").update(content).digest("hex") !== expectedSha) {
    fail("DEPLOYMENT_FILE_SHA256_MISMATCH");
  }
}

function inputs(env, io) {
  const releaseDir = required(env, "RELEASE_DIR");
  if (!isAbsolute(releaseDir) || !releaseDir.split(/[\\/]/).includes("releases") ||
      !/^(?:v?\d+(?:[._-][a-z0-9]+)*|[a-f0-9]{8,64})$/i.test(releaseDir.split(/[\\/]/).at(-1) ?? "")) fail("DEPLOYMENT_RELEASE_DIR_INVALID");
  let realRelease;
  try { realRelease = io.realpath(releaseDir); } catch { fail("DEPLOYMENT_RELEASE_DIR_INVALID"); }
  if (realRelease !== resolve(releaseDir)) fail("DEPLOYMENT_RELEASE_DIR_INVALID");
  if ((env.COMPOSE_PROJECT_NAME ?? PROJECT) !== PROJECT) fail("DEPLOYMENT_PROJECT_NAME_INVALID");
  const config = {
    releaseDir, project: PROJECT,
    composeEnv: required(env, "COMPOSE_ENV_FILE"),
    websiteManifest: resolve(releaseDir, "deploy/compose.website.yml"),
    gatewayManifest: resolve(releaseDir, "deploy/compose.gateway.yml"),
    image: required(env, "SHOUBAN_IMAGE"),
    gatewayImage: required(env, "SHOUBAN_GATEWAY_IMAGE"),
    runtimeEnv: required(env, "SHOUBAN_RUNTIME_ENV_FILE"),
    runtimeSha: required(env, "SHOUBAN_RUNTIME_ENV_SHA256"),
    gatewayConfig: required(env, "SHOUBAN_GATEWAY_CONFIG"),
    gatewaySha: required(env, "SHOUBAN_GATEWAY_CONFIG_SHA256"),
    network: required(env, "SHOUBAN_PROXY_NETWORK"),
    bindIp: required(env, "SHOUBAN_BIND_IP"),
    port: required(env, "SHOUBAN_GATEWAY_PORT"),
    domain: required(env, "SHOUBAN_SITE_DOMAIN"),
    assistant: required(env, "ASSISTANT_CONTAINER"),
    proxyCidrs: validateTrustedProxyCidrs(required(env, "SHOUBAN_TRUSTED_PROXY_CIDRS"))
  };
  if (!DIGEST_IMAGE.test(config.image) || !DIGEST_IMAGE.test(config.gatewayImage)) fail("DEPLOYMENT_IMAGE_NOT_DIGEST");
  if (!SHA256.test(config.runtimeSha) || !SHA256.test(config.gatewaySha)) fail("DEPLOYMENT_SHA256_INVALID");
  if (!NETWORK.test(config.network) || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(config.assistant)) fail("DEPLOYMENT_RESOURCE_NAME_INVALID");
  if (!isPrivateBindIp(config.bindIp)) fail("DEPLOYMENT_BIND_IP_NOT_PRIVATE");
  if (!/^[1-9][0-9]{3,4}$/.test(config.port) || Number(config.port) < 1024 || Number(config.port) > 65535) fail("DEPLOYMENT_GATEWAY_PORT_INVALID");
  const origin = "https://" + config.domain;
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(config.domain) ||
      !isExactHttpsOrigin(origin) || isReservedSiteOrigin(origin) ||
      (env.SITE_ORIGIN !== undefined && env.SITE_ORIGIN !== origin) ||
      (env.SITE_HOST !== undefined && env.SITE_HOST !== config.domain)) fail("DEPLOYMENT_CANONICAL_ORIGIN_INVALID");
  config.origin = origin;
  checkedFile(config.composeEnv, releaseDir, io, true);
  checkedFile(config.websiteManifest, releaseDir, io);
  checkedFile(config.gatewayManifest, releaseDir, io);
  checkedFile(config.runtimeEnv, releaseDir, io, true, config.runtimeSha);
  checkedFile(config.gatewayConfig, releaseDir, io, false, config.gatewaySha);
  return config;
}

function command(run, program, args, code) {
  let result;
  const fixedArgs = program === "docker" ? ["--host", "unix:///var/run/docker.sock", ...args] : args;
  try { result = run(program, fixedArgs, { encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }); }
  catch { fail(code); }
  if (!result || result.error || result.status !== 0) fail(code);
  return String(result.stdout ?? "");
}

function jsonCommand(run, args, code) {
  const output = command(run, "docker", args, code);
  try { return JSON.parse(output); } catch { fail(code); }
}

function composeArgs(config) {
  return ["compose", "--project-name", config.project, "--env-file", config.composeEnv,
    "-f", config.websiteManifest, "-f", config.gatewayManifest];
}

function boundedResources(service, gateway = false) {
  const memory = Number(service.mem_limit);
  const cpu = Number(service.cpus);
  return memory > 0 && memory <= (gateway ? 256 : 1536) * 1024 * 1024 &&
    Number(service.memswap_limit) === memory && cpu > 0 && cpu <= (gateway ? 0.5 : 1) &&
    Number(service.pids_limit) > 0 && Number(service.pids_limit) <= 128;
}

function hardened(service) {
  return service.read_only === true && service.cap_drop?.includes("ALL") &&
    service.security_opt?.some((item) => item === "no-new-privileges:true" || item === "no-new-privileges") &&
    service.restart === "unless-stopped" && service.logging?.driver === "json-file" &&
    service.logging.options?.["max-size"] === "10m" && service.logging.options?.["max-file"] === "3";
}

export function validateDeploymentModel(model, config) {
  if (!model || model.name !== PROJECT || !sameKeys(model.services, ["website", "gateway"]) ||
      !sameKeys(model.networks, ["shouban-proxy"]) ||
      model.networks["shouban-proxy"].name !== config.network || model.networks["shouban-proxy"].external !== true) fail("PREFLIGHT_COMPOSE_MODEL_INVALID");
  for (const key of ["volumes", "secrets", "configs"]) {
    if (Object.keys(model[key] ?? {}).length !== 0) fail("PREFLIGHT_COMPOSE_SHARED_RESOURCE_INVALID");
  }
  const { website, gateway } = model.services;
  for (const [service, image, isGateway] of [[website, config.image, false], [gateway, config.gatewayImage, true]]) {
    if (service.image !== image || service.build || service.network_mode || service.privileged ||
        !sameKeys(service.networks, ["shouban-proxy"]) || !hardened(service) || !boundedResources(service, isGateway)) fail("PREFLIGHT_SERVICE_BOUNDARY_INVALID");
    for (const key of ["command", "entrypoint", "pid", "ipc", "userns_mode", "uts", "runtime", "cgroup_parent", "container_name", "deploy"]) {
      if (service[key] !== undefined && service[key] !== null) fail("PREFLIGHT_SERVICE_OVERRIDE_FORBIDDEN");
    }
    for (const key of ["cap_add", "devices", "device_cgroup_rules", "extra_hosts", "volumes_from", "links", "external_links", "group_add", "secrets", "configs"]) {
      if (Object.keys(service[key] ?? {}).length !== 0) fail("PREFLIGHT_SERVICE_OVERRIDE_FORBIDDEN");
    }
    if (Object.keys(service.sysctls ?? {}).length !== 0 || (service.scale !== undefined && service.scale !== 1) ||
        service.healthcheck?.disable === true || !Array.isArray(service.healthcheck?.test) || service.healthcheck.test.length === 0) fail("PREFLIGHT_SERVICE_OVERRIDE_FORBIDDEN");
  }
  if (website.user !== "1000:1000" || website.command || website.entrypoint || (website.ports?.length ?? 0) !== 0 ||
      (website.volumes?.length ?? 0) !== 0 ||
      website.environment?.NEXT_PUBLIC_SITE_URL !== config.origin || website.environment?.SHOUBAN_SITE_DOMAIN !== config.domain) fail("PREFLIGHT_WEBSITE_BOUNDARY_INVALID");
  const ports = gateway.ports;
  if (!Array.isArray(ports) || ports.length !== 1 || ports[0].host_ip !== config.bindIp ||
      String(ports[0].published) !== config.port || Number(ports[0].target) !== 8080 || ports[0].protocol !== "tcp") fail("PREFLIGHT_GATEWAY_PORT_INVALID");
  if (gateway.user !== "1000:1000" ||
      gateway.environment?.SHOUBAN_SITE_DOMAIN !== config.domain ||
      gateway.environment?.SHOUBAN_TRUSTED_PROXY_CIDRS !== config.proxyCidrs.join(" ")) fail("PREFLIGHT_GATEWAY_ENVIRONMENT_INVALID");
  if (!Array.isArray(gateway.volumes) || gateway.volumes.length !== 1 || gateway.volumes[0].type !== "bind" ||
      gateway.volumes[0].source !== config.gatewayConfig || gateway.volumes[0].target !== "/etc/caddy/Caddyfile" ||
      gateway.volumes[0].read_only !== true) fail("PREFLIGHT_GATEWAY_CONFIG_MOUNT_INVALID");
}

function inspect(run, container, code) {
  return jsonCommand(run, ["inspect", "--format", INSPECT, container], code);
}

function containerMatches(actual, service, name, config) {
  if (actual.state !== "running" || actual.health !== "healthy" || actual.project !== PROJECT || actual.service !== name ||
      actual.image !== service.image || actual.user !== service.user || !sameKeys(actual.networks, [config.network]) ||
      actual.readOnly !== true || !actual.capDrop?.includes("ALL") ||
      !actual.securityOpt?.some((item) => item === "no-new-privileges:true" || item === "no-new-privileges") ||
      actual.nanoCpus !== Number(service.cpus) * 1e9 || actual.memory !== Number(service.mem_limit) ||
      actual.memorySwap !== Number(service.memswap_limit) || actual.pids !== Number(service.pids_limit) ||
      actual.restart !== "unless-stopped" || actual.logging?.Type !== "json-file" ||
      actual.logging.Config?.["max-size"] !== "10m" || actual.logging.Config?.["max-file"] !== "3") fail("PREFLIGHT_CONTAINER_BOUNDARY_INVALID");
}

function inspectDeployment(config, model, run, io) {
  for (const image of [config.image, config.gatewayImage]) command(run, "docker", ["image", "inspect", "--format", "{{.Id}}", image], "PREFLIGHT_IMAGE_NOT_PRESENT");
  const assistant = inspect(run, config.assistant, "PREFLIGHT_ASSISTANT_NOT_FOUND");
  if (assistant.state !== "running" || assistant.health !== "healthy") fail("PREFLIGHT_ASSISTANT_NOT_HEALTHY");
  if (Object.hasOwn(assistant.networks ?? {}, config.network)) fail("PREFLIGHT_ASSISTANT_ON_WEBSITE_NETWORK");
  const containers = {};
  for (const service of ["website", "gateway"]) {
    const id = command(run, "docker", [...composeArgs(config), "ps", "-q", service], "PREFLIGHT_COMPOSE_QUERY_FAILED").trim();
    if (!/^[a-f0-9]{12,64}$/.test(id)) fail("PREFLIGHT_SERVICE_CONTAINER_MISSING");
    containers[service] = inspect(run, id, "PREFLIGHT_CONTAINER_INSPECT_FAILED");
    containerMatches(containers[service], model.services[service], service, config);
  }
  const { website, gateway } = containers;
  if (Object.keys(website.ports ?? {}).length !== 0) fail("PREFLIGHT_WEBSITE_HAS_PUBLISHED_PORTS");
  if (Object.keys(website.networks).some((network) => Object.hasOwn(assistant.networks ?? {}, network))) fail("PREFLIGHT_WEBSITE_ON_ASSISTANT_NETWORK");
  if (!sameKeys(gateway.ports, ["8080/tcp"]) || !Array.isArray(gateway.ports["8080/tcp"]) ||
      gateway.ports["8080/tcp"].length !== 1 || gateway.ports["8080/tcp"][0].HostIp !== config.bindIp ||
      gateway.ports["8080/tcp"][0].HostPort !== config.port) fail("PREFLIGHT_GATEWAY_PUBLISHED_BINDING_INVALID");
  const binds = gateway.mounts?.filter((mount) => mount.Type === "bind");
  if (!Array.isArray(binds) || binds.length !== 1 || binds[0].Source !== config.gatewayConfig ||
      binds[0].Destination !== "/etc/caddy/Caddyfile" || binds[0].RW !== false ||
      gateway.mounts.some((mount) => mount.Type !== "bind" &&
        !(mount.Type === "tmpfs" && ["/tmp", "/data", "/config"].includes(mount.Destination)))) fail("PREFLIGHT_GATEWAY_RUNNING_CONFIG_INVALID");
  if (website.mounts?.some((mount) => mount.Type !== "tmpfs" || !["/tmp", "/app/.next/cache"].includes(mount.Destination))) fail("PREFLIGHT_WEBSITE_RUNNING_MOUNT_INVALID");
  const members = jsonCommand(run, ["network", "inspect", "--format", "{{json .Containers}}", config.network], "PREFLIGHT_NETWORK_INSPECT_FAILED");
  if (!sameKeys(members, [website.id, gateway.id]) || website.id === gateway.id) fail("PREFLIGHT_NETWORK_MEMBERS_NOT_EXACT");
  const dockerRoot = command(run, "docker", ["info", "--format", "{{.DockerRootDir}}"], "PREFLIGHT_DOCKER_ENGINE_UNAVAILABLE").trim();
  if (!isAbsolute(dockerRoot)) fail("PREFLIGHT_DOCKER_ROOT_INVALID");
  const disk = command(run, "df", ["-Pk", dockerRoot], "PREFLIGHT_DISK_UNAVAILABLE").trim().split(/\r?\n/).at(-1)?.trim().split(/\s+/);
  if (!disk || !/^\d+$/.test(disk[3] ?? "") || Number(disk[3]) < 10485760) fail("PREFLIGHT_DOCKER_DISK_BELOW_10_GIB");
  let memory;
  try { memory = String(io.read("/proc/meminfo", "utf8")); } catch { fail("PREFLIGHT_MEMORY_UNAVAILABLE"); }
  const available = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(memory);
  if (!available || Number(available[1]) < 3670016) fail("PREFLIGHT_MEMORY_BELOW_3_5_GIB");
}

function http(run, config, mode, alb, protocol, path) {
  const port = protocol === "https" ? "443" : "80";
  const args = ["--silent", "--show-error", "--noproxy", "*", "--connect-timeout", "5", "--max-time", "15",
    "--max-redirs", "0", "--proto", "=http,https", "--request", "GET", "--dump-header", "-", "--output", "/dev/null",
    "--write-out", "\nSHOUBAN_STATUS:%{http_code}\n"];
  if (mode === "pre-dns") args.push("--connect-to", `${config.domain}:${port}:${alb}:${port}`);
  args.push(`${protocol}://${config.domain}${path}`);
  const output = command(run, "curl", args, "ACCEPTANCE_HTTP_REQUEST_FAILED");
  const status = /\nSHOUBAN_STATUS:(\d{3})\s*$/.exec(output)?.[1];
  const headers = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^([^:\s]+):\s*(.*)$/.exec(line);
    if (match) {
      const key = match[1].toLowerCase();
      if (Object.hasOwn(headers, key) && ["location", "cache-control", "x-content-type-options", "referrer-policy"].includes(key)) fail("ACCEPTANCE_RESPONSE_HEADERS_AMBIGUOUS");
      headers[key] = match[2].trim();
    }
  }
  return { status, headers };
}

export function runDeploymentChecks({ mode, modelOnly = false, env = process.env, run = spawnSync, io = defaultIo, platform = process.platform }) {
  if (mode !== "preflight" && mode !== "acceptance") fail("DEPLOYMENT_MODE_INVALID");
  if (modelOnly && mode !== "preflight") fail("DEPLOYMENT_ARGUMENT_INVALID");
  const config = inputs(env, io);
  // Do not inherit DOCKER_HOST/CONTEXT, COMPOSE_*, SMTP_* or proxy variables.
  // Only approved interpolation inputs reach Compose, against a fixed local socket.
  const childEnv = { PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin", HOME: process.env.HOME ?? "/root", LANG: "C", LC_ALL: "C" };
  for (const key of ["SHOUBAN_IMAGE", "SHOUBAN_GATEWAY_IMAGE", "SHOUBAN_RUNTIME_ENV_FILE", "SHOUBAN_RUNTIME_ENV_SHA256",
    "SHOUBAN_GATEWAY_CONFIG", "SHOUBAN_GATEWAY_CONFIG_SHA256", "SHOUBAN_PROXY_NETWORK", "SHOUBAN_BIND_IP",
    "SHOUBAN_GATEWAY_PORT", "SHOUBAN_SITE_DOMAIN", "SHOUBAN_TRUSTED_PROXY_CIDRS"]) childEnv[key] = env[key];
  childEnv.COMPOSE_PROJECT_NAME = PROJECT;
  childEnv.NEXT_PUBLIC_SITE_URL = config.origin;
  const execute = (program, args, options) => run(program, args, { ...options, env: childEnv });
  // Resolved JSON may contain runtime secrets: capture only; never inherit or
  // print Docker stdout/stderr, including on parsing/command failures.
  const model = jsonCommand(execute, [...composeArgs(config), "config", "--format", "json"], "PREFLIGHT_COMPOSE_INVALID");
  validateDeploymentModel(model, config);
  if (modelOnly) return "PREFLIGHT_MODEL_ONLY_OK_NOT_DEPLOYMENT_APPROVAL";
  if (platform !== "linux") fail("PREFLIGHT_LOCAL_LINUX_HOST_REQUIRED");
  inspectDeployment(config, model, execute, io);
  checkedFile(config.runtimeEnv, config.releaseDir, io, true, config.runtimeSha);
  checkedFile(config.gatewayConfig, config.releaseDir, io, false, config.gatewaySha);
  if (mode === "preflight") return "PREFLIGHT_READ_ONLY_OK_NOT_TRAFFIC_APPROVAL";
  const acceptanceMode = env.ACCEPTANCE_MODE ?? "pre-dns";
  if (!["pre-dns", "public"].includes(acceptanceMode)) fail("ACCEPTANCE_MODE_INVALID");
  let alb;
  if (acceptanceMode === "pre-dns") {
    alb = required(env, "ALB_DNS_NAME");
    if (!/^[a-z0-9-]+\.[a-z0-9-]+\.alb\.(?:aliyuncsslb|aliyuncs)\.com$/.test(alb)) fail("ACCEPTANCE_ALB_DNS_NAME_INVALID");
  }
  const redirect = http(execute, config, acceptanceMode, alb, "http", "/");
  if (!["301", "308"].includes(redirect.status) || redirect.headers.location !== config.origin + "/") fail("ACCEPTANCE_CANONICAL_REDIRECT_INVALID");
  for (const [path, expected] of [["/", "200"], ["/contact", "200"], ["/privacy", "200"], ["/api/contact", "405"]]) {
    const response = http(execute, config, acceptanceMode, alb, "https", path);
    if (response.status !== expected) fail("ACCEPTANCE_ROUTE_STATUS_INVALID");
    if (path !== "/") {
      const tokens = (response.headers["cache-control"] ?? "").toLowerCase().split(",").map((item) => item.trim());
      if (!tokens.includes("private") || !tokens.includes("no-store")) fail("ACCEPTANCE_ROUTE_CACHE_HEADER_INVALID");
    }
    if (response.headers["x-content-type-options"] !== "nosniff" ||
        response.headers["referrer-policy"] !== "strict-origin-when-cross-origin") fail("ACCEPTANCE_SECURITY_HEADER_INVALID");
  }
  return "ACCEPTANCE_READ_ONLY_OK mode=" + acceptanceMode;
}

function main() {
  try {
    if (Number(process.versions.node.split(".")[0]) !== 24) fail("DEPLOYMENT_NODE_24_REQUIRED");
    const [mode, ...args] = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== "--model-only")) fail("DEPLOYMENT_ARGUMENT_INVALID");
    process.stdout.write(runDeploymentChecks({ mode, modelOnly: args[0] === "--model-only" }) + "\n");
  } catch (error) {
    const code = typeof error?.code === "string" && /^(?:DEPLOYMENT|PREFLIGHT|ACCEPTANCE)_[A-Z0-9_]+$/.test(error.code)
      ? error.code : "DEPLOYMENT_CHECK_INTERNAL_ERROR";
    process.stderr.write(code + "\n");
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
