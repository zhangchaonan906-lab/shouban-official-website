import * as fs from "node:fs";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { parseEnv } from "node:util";
import { compareSiteDomainToOrigin, isReservedSiteOrigin } from "./site-origin.mjs";
import { isPrivateBindIp, validateTrustedProxyCidrs } from "./deployment-checks.mjs";

const HASH = /^[a-f0-9]{64}$/;
const RELEASE_ID = /^(?:v?\d+(?:[._-][a-z0-9]+)*|[a-f0-9]{8,64})$/;
const REPOSITORY = /^(?:[a-z0-9]+(?:[.-][a-z0-9]+)*(?::[0-9]+)?\/)?[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*$/;
const FILE_KEYS = ["runtimeEnv", "composeEnv", "websiteManifest", "gatewayManifest", "gatewayConfig"];
const DESCRIPTOR_KEYS = ["schemaVersion", "project", "releaseId", "mode", "siteOrigin", "siteDomain", "proxyNetwork", "privateBindIp", "gatewayPort", "albDnsName", "trustedProxyCidrs", "websiteImage", "gatewayImage", "files"];
const COMPOSE_METADATA = ["COMPOSE_PROJECT_NAME", "RELEASE_DIR", "ASSISTANT_CONTAINER"];
const DOCKER_PREFIX = ["--host", "unix:///var/run/docker.sock"];
const failure = (code) => ({ ok: false, code });
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const knownKeys = (value, keys) => Object.keys(value).every((key) => keys.includes(key));

function safePath(value) {
  return typeof value === "string" && value === value.trim() && value.startsWith("/") &&
    value === posix.normalize(value) && !/[\u0000-\u001f\u007f\\$`,]/.test(value) &&
    !value.split("/").some((part) => part === ".." || part === ".");
}
function imageError(value) {
  if (typeof value !== "string" || value !== value.trim()) return "ROLLBACK_IMAGE_REFERENCE_INVALID";
  const parts = value.split("@");
  if (parts.length !== 2 || !/^sha256:[a-f0-9]{64}$/.test(parts[1])) return "ROLLBACK_IMAGE_REFERENCE_NOT_DIGEST";
  return REPOSITORY.test(parts[0]) ? null : "ROLLBACK_IMAGE_REFERENCE_INVALID";
}
function safeDnsName(value) {
  return typeof value === "string" && value.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

/** A descriptor is data only. Unknown keys (including commands) are rejected. */
export function createRollbackPlan(options) {
  if (!object(options)) return failure("ROLLBACK_PREVIOUS_RELEASE_MISSING");
  if (!Object.hasOwn(options, "descriptor")) {
    // Retain the callable API, but never return its former unsafe executable command.
    if (!object(options.previousRelease)) return failure("ROLLBACK_PREVIOUS_RELEASE_MISSING");
    const old = options.previousRelease;
    const error = imageError(old.image);
    if (error) return failure(error);
    if (!safePath(old.runtimeEnvFile) || !/\/releases\/(?:v?\d+(?:[._-][a-z0-9]+)*|[a-f0-9]{8,64})\/.+/.test(old.runtimeEnvFile) || !HASH.test(old.runtimeEnvSha256 ?? "")) return failure("ROLLBACK_RUNTIME_CONFIG_INVALID");
    if (!safePath(options.composeFile) || !/^[a-z0-9][a-z0-9_.-]{0,62}$/.test(options.proxyNetwork ?? "")) return failure("ROLLBACK_COMPOSE_INPUT_INVALID");
    return failure("ROLLBACK_LEGACY_DESCRIPTOR_REQUIRED");
  }
  const d = options.descriptor;
  if (!object(d) || !knownKeys(d, DESCRIPTOR_KEYS) || d.schemaVersion !== 1 || d.project !== "shouban-prod" || typeof d.releaseId !== "string" || !RELEASE_ID.test(d.releaseId) || !["website", "maintenance"].includes(d.mode)) return failure("ROLLBACK_DESCRIPTOR_INVALID");
  const descriptorPath = options.descriptorPath;
  if (!safePath(descriptorPath) || posix.basename(descriptorPath) !== "release.json") return failure("ROLLBACK_PATH_INVALID");
  const releaseRoot = posix.dirname(descriptorPath);
  if (posix.basename(releaseRoot) !== d.releaseId || posix.basename(posix.dirname(releaseRoot)) !== "releases") return failure("ROLLBACK_PATH_INVALID");
  if (isReservedSiteOrigin(d.siteOrigin) || !safeDnsName(d.siteDomain) || !compareSiteDomainToOrigin(d.siteDomain, d.siteOrigin).ok || !safeDnsName(d.albDnsName) || !/^[a-z0-9-]+\.[a-z0-9-]+\.alb\.aliyuncsslb\.com$/.test(d.albDnsName)) return failure("ROLLBACK_ORIGIN_INVALID");
  if (typeof d.proxyNetwork !== "string" || !/^shouban-prod(?:-[a-z0-9][a-z0-9_.-]{0,45})?$/.test(d.proxyNetwork) || !isPrivateBindIp(d.privateBindIp) || !Number.isInteger(d.gatewayPort) || d.gatewayPort < 1024 || d.gatewayPort > 65535) return failure("ROLLBACK_NETWORK_INVALID");
  try {
    if (!Array.isArray(d.trustedProxyCidrs) || !d.trustedProxyCidrs.length || !d.trustedProxyCidrs.every((cidr) => typeof cidr === "string") || JSON.stringify(validateTrustedProxyCidrs(d.trustedProxyCidrs.join(" "))) !== JSON.stringify(d.trustedProxyCidrs)) return failure("ROLLBACK_NETWORK_INVALID");
  } catch { return failure("ROLLBACK_NETWORK_INVALID"); }
  for (const image of [d.gatewayImage, ...(d.mode === "website" || d.websiteImage !== undefined ? [d.websiteImage] : [])]) {
    const error = imageError(image);
    if (error) return failure(error);
  }
  if (!object(d.files) || !knownKeys(d.files, FILE_KEYS)) return failure("ROLLBACK_FILES_INVALID");
  for (const key of FILE_KEYS) {
    const file = d.files[key];
    if (key === "runtimeEnv" && d.mode === "maintenance" && file === undefined) continue;
    if (!object(file) || !knownKeys(file, ["path", "sha256"]) || !safePath(file.path) || !file.path.startsWith(releaseRoot + "/") || file.path === descriptorPath || typeof file.sha256 !== "string" || !HASH.test(file.sha256)) return failure("ROLLBACK_FILES_INVALID");
  }
  const paths = Object.values(d.files).map((file) => file.path);
  if (new Set(paths).size !== paths.length) return failure("ROLLBACK_FILES_INVALID");
  const environment = {
    COMPOSE_PROJECT_NAME: "shouban-prod", RELEASE_DIR: releaseRoot,
    SHOUBAN_IMAGE: d.websiteImage ?? "", SHOUBAN_GATEWAY_IMAGE: d.gatewayImage,
    SHOUBAN_RUNTIME_ENV_FILE: d.files.runtimeEnv?.path ?? "", SHOUBAN_RUNTIME_ENV_SHA256: d.files.runtimeEnv?.sha256 ?? "",
    SHOUBAN_GATEWAY_CONFIG: d.files.gatewayConfig.path, SHOUBAN_GATEWAY_CONFIG_SHA256: d.files.gatewayConfig.sha256,
    SHOUBAN_PROXY_NETWORK: d.proxyNetwork, SHOUBAN_BIND_IP: d.privateBindIp, SHOUBAN_GATEWAY_PORT: String(d.gatewayPort),
    SHOUBAN_SITE_DOMAIN: d.siteDomain, SHOUBAN_TRUSTED_PROXY_CIDRS: d.trustedProxyCidrs.join(" "), ALB_DNS_NAME: d.albDnsName
  };
  const services = d.mode === "maintenance" ? ["gateway"] : ["website", "gateway"];
  const compose = [...DOCKER_PREFIX, "compose", "--project-name", "shouban-prod", "--project-directory", releaseRoot, "--env-file", d.files.composeEnv.path];
  if (d.mode === "website") compose.push("-f", d.files.websiteManifest.path);
  compose.push("-f", d.files.gatewayManifest.path);
  const steps = [{ name: "compose-config", args: [...compose, "config", "--quiet"] }, { name: "compose-model", args: [...compose, "config", "--format", "json"] }];
  if (d.mode === "website") {
    const isolated = [...DOCKER_PREFIX, "run", "--rm", "--pull", "never", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true", "--user", "1000:1000", "--pids-limit", "64", "--memory", "256m", "--env-file", d.files.runtimeEnv.path,
      "--env", "NODE_OPTIONS=", "--env", "NODE_PATH=", "--env", "LD_PRELOAD=", "--env", "LD_LIBRARY_PATH=", "--env", `NEXT_PUBLIC_SITE_URL=${d.siteOrigin}`, "--env", `SHOUBAN_SITE_DOMAIN=${d.siteDomain}`, "--entrypoint", "/usr/local/bin/node", d.websiteImage];
    steps.push({ name: "release-check", args: [...isolated, "/app/scripts/privacy-release-check.mjs"] });
    steps.push({ name: "origin-check", args: [...isolated, "/app/scripts/deployment/check-built-site-origin.mjs"] });
  }
  steps.push({ name: "gateway-check", args: [...DOCKER_PREFIX, "run", "--rm", "--pull", "never", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true", "--user", "1000:1000", "--pids-limit", "64", "--memory", "128m", "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777", "--tmpfs", "/config:rw,noexec,nosuid,nodev,size=8m,uid=1000,gid=1000,mode=0700", "--tmpfs", "/data:rw,noexec,nosuid,nodev,size=8m,uid=1000,gid=1000,mode=0700", "--env", "HOME=/tmp", "--env", "XDG_CONFIG_HOME=/config", "--env", "XDG_DATA_HOME=/data", "--env", `SHOUBAN_SITE_DOMAIN=${d.siteDomain}`, "--env", `SHOUBAN_TRUSTED_PROXY_CIDRS=${d.trustedProxyCidrs.join(" ")}`, "--mount", `type=bind,source=${d.files.gatewayConfig.path},target=/etc/caddy/Caddyfile,readonly`, "--entrypoint", "caddy", d.gatewayImage, "validate", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"] });
  steps.push({ name: "up", args: [...compose, "up", "-d", "--no-build", "--pull", "never", "--no-deps", "--wait", "--wait-timeout", "120", ...services] });
  return { ok: true, descriptor: structuredClone(d), descriptorPath, releaseRoot, environment, services, steps, requiresApply: true };
}

const nativeIo = { platform: process.platform, uid: typeof process.getuid === "function" ? process.getuid() : -1, lstatSync: fs.lstatSync, realpathSync: fs.realpathSync, readFileSync: fs.readFileSync };
function protectedFile(path, secret, io) {
  const segments = path.split("/").filter(Boolean);
  let current = "";
  for (let index = 0; index < segments.length; index++) {
    current += "/" + segments[index];
    const stat = io.lstatSync(current);
    if (stat.isSymbolicLink() || io.realpathSync(current) !== current || ![0, io.uid].includes(stat.uid)) return false;
    if (index < segments.length - 1) {
      if (!stat.isDirectory() || (stat.mode & 0o022) !== 0) return false;
    } else if (!stat.isFile() || stat.nlink !== 1 || stat.size > 1024 * 1024 || (stat.mode & 0o022) !== 0 || (secret && (stat.mode & 0o077) !== 0) || (stat.mode & 0o400) === 0) return false;
  }
  return true;
}
function plainEnvironment(text) {
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match || seen.has(match[1]) || /[\u0000-\u001f\u007f]/.test(match[2])) return null;
    seen.add(match[1]);
  }
  return parseEnv(text);
}
/** Never returns file contents, paths from failures, raw errors, or secret values. */
export function verifyRollbackFiles(plan, io = nativeIo) {
  if (!plan?.ok) return failure("ROLLBACK_PLAN_INVALID");
  if (io.platform !== "linux") return failure("ROLLBACK_LINUX_REQUIRED");
  try {
    if (!protectedFile(plan.descriptorPath, false, io)) return failure("ROLLBACK_FILE_PROTECTION_INVALID");
    if (JSON.stringify(JSON.parse(io.readFileSync(plan.descriptorPath, "utf8"))) !== JSON.stringify(plan.descriptor)) return failure("ROLLBACK_DESCRIPTOR_CHANGED");
    const contents = {};
    for (const [key, file] of Object.entries(plan.descriptor.files)) {
      if (plan.descriptor.mode === "maintenance" && key === "runtimeEnv") continue;
      if (!protectedFile(file.path, ["runtimeEnv", "composeEnv"].includes(key), io)) return failure("ROLLBACK_FILE_PROTECTION_INVALID");
      const content = io.readFileSync(file.path);
      if (createHash("sha256").update(content).digest("hex") !== file.sha256) return failure("ROLLBACK_FILE_HASH_MISMATCH");
      contents[key] = content.toString("utf8");
    }
    const composeEnv = plainEnvironment(contents.composeEnv);
    if (!composeEnv || !Object.keys(composeEnv).every((key) => Object.hasOwn(plan.environment, key) || COMPOSE_METADATA.includes(key)) || !Object.entries(plan.environment).every(([key, value]) => composeEnv[key] === value || (COMPOSE_METADATA.includes(key) && composeEnv[key] === undefined) || (plan.descriptor.mode === "maintenance" && ["SHOUBAN_IMAGE", "SHOUBAN_RUNTIME_ENV_FILE", "SHOUBAN_RUNTIME_ENV_SHA256"].includes(key) && composeEnv[key] === undefined))) return failure("ROLLBACK_ENV_BINDING_MISMATCH");
    if (plan.descriptor.mode === "website") {
      const runtime = parseEnv(contents.runtimeEnv);
      if (runtime.NEXT_PUBLIC_SITE_URL !== plan.descriptor.siteOrigin || runtime.SHOUBAN_SITE_DOMAIN !== plan.descriptor.siteDomain) return failure("ROLLBACK_ORIGIN_BINDING_MISMATCH");
    }
    const gateway = contents.gatewayConfig;
    if (!gateway.includes("{$SHOUBAN_SITE_DOMAIN}") || !gateway.includes("{$SHOUBAN_TRUSTED_PROXY_CIDRS}") || !gateway.includes(":8080") || !gateway.includes("admin off") || !gateway.includes("auto_https off") || (plan.descriptor.mode === "maintenance" ? /reverse_proxy/.test(gateway) : !gateway.includes("reverse_proxy shouban-website:3000"))) return failure("ROLLBACK_GATEWAY_MODE_INVALID");
    for (const key of ["websiteManifest", "gatewayManifest"]) {
      if (/^\s*(?:include|extends|build|privileged|network_mode|pid|ipc|devices|command|entrypoint)\s*:/m.test(contents[key])) return failure("ROLLBACK_MANIFEST_UNSAFE");
    }
    return { ok: true };
  } catch { return failure("ROLLBACK_FILE_CHECK_FAILED"); }
}
export function loadRollbackPlan(descriptorPath, io = nativeIo) {
  if (!safePath(descriptorPath) || posix.basename(descriptorPath) !== "release.json") return failure("ROLLBACK_PATH_INVALID");
  if (io.platform !== "linux") return failure("ROLLBACK_LINUX_REQUIRED");
  try {
    if (!protectedFile(descriptorPath, false, io)) return failure("ROLLBACK_FILE_PROTECTION_INVALID");
    const plan = createRollbackPlan({ descriptor: JSON.parse(io.readFileSync(descriptorPath, "utf8")), descriptorPath });
    if (!plan.ok) return plan;
    const verification = verifyRollbackFiles(plan, io);
    return verification.ok ? plan : verification;
  } catch { return failure("ROLLBACK_DESCRIPTOR_READ_FAILED"); }
}
/** Inspect resolved Compose only in memory; its environment must never reach logs. */
export function verifyRollbackComposeModel(plan, model) {
  try {
    if (!object(model) || model.name !== "shouban-prod" || !object(model.services) || Object.keys(model.services).sort().join(",") !== [...plan.services].sort().join(",") || Object.keys(model.networks ?? {}).join(",") !== "shouban-proxy" || model.networks["shouban-proxy"].name !== plan.descriptor.proxyNetwork || model.networks["shouban-proxy"].external !== true || Object.keys(model.volumes ?? {}).length || Object.keys(model.secrets ?? {}).length || Object.keys(model.configs ?? {}).length) return false;
    for (const [name, service] of Object.entries(model.services)) {
      const memory = Number(service.mem_limit);
      const cpus = Number(service.cpus);
      const maxMemory = (name === "gateway" ? 256 : 1536) * 1024 * 1024;
      const tmpfsPaths = name === "gateway" ? ["/tmp", "/config", "/data"] : ["/tmp", "/app/.next/cache"];
      const healthcheck = name === "gateway" ? ["CMD", "wget", "-q", "-T", "3", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"] : ["CMD", "node", "/app/scripts/deployment/healthcheck.mjs"];
      if (service.build || service.privileged || service.network_mode || service.pid || service.ipc || service.devices || service.command || service.entrypoint || service.user !== "1000:1000" || service.read_only !== true || service.restart !== "unless-stopped" || !service.cap_drop?.includes("ALL") || service.cap_add?.length || !service.security_opt?.some((option) => /^no-new-privileges(?::true)?$/.test(option)) || Object.keys(service.networks ?? {}).join(",") !== "shouban-proxy" ||
          !(memory > 0 && memory <= maxMemory) || Number(service.memswap_limit) !== memory || !(cpus > 0 && cpus <= (name === "gateway" ? 0.5 : 1)) || !(Number(service.pids_limit) > 0 && Number(service.pids_limit) <= 128) ||
          service.init !== true || !Array.isArray(service.tmpfs) || service.tmpfs.length !== tmpfsPaths.length ||
          !service.tmpfs.every((mount) => typeof mount === "string" && tmpfsPaths.includes(mount.split(":")[0]) && ["noexec", "nosuid", "nodev"].every((option) => mount.split(":").slice(1).join(":").split(",").includes(option))) ||
          service.logging?.driver !== "json-file" || service.logging?.options?.["max-size"] !== "10m" || service.logging?.options?.["max-file"] !== "3" ||
          JSON.stringify(service.healthcheck?.test) !== JSON.stringify(healthcheck) || service.healthcheck.disable === true) return false;
      if (name === "website") {
        if (service.image !== plan.descriptor.websiteImage || service.ports?.length || service.volumes?.length || service.environment?.NEXT_PUBLIC_SITE_URL !== plan.descriptor.siteOrigin || service.environment?.SHOUBAN_SITE_DOMAIN !== plan.descriptor.siteDomain) return false;
      } else {
        const p = service.ports;
        const v = service.volumes;
        if (service.image !== plan.descriptor.gatewayImage || !Array.isArray(p) || p.length !== 1 || p[0].host_ip !== plan.descriptor.privateBindIp || String(p[0].published) !== String(plan.descriptor.gatewayPort) || p[0].target !== 8080 || p[0].protocol !== "tcp" || !Array.isArray(v) || v.length !== 1 || v[0].type !== "bind" || v[0].source !== plan.descriptor.files.gatewayConfig.path || v[0].target !== "/etc/caddy/Caddyfile" || v[0].read_only !== true || v[0].bind?.create_host_path !== false || service.environment?.SHOUBAN_SITE_DOMAIN !== plan.descriptor.siteDomain || service.environment?.SHOUBAN_TRUSTED_PROXY_CIDRS !== plan.descriptor.trustedProxyCidrs.join(" ")) return false;
      }
    }
    return true;
  } catch { return false; }
}
/** Docker is never called unless apply is explicitly true. The runner never uses a shell. */
export function executeRollback(plan, { apply = false, run, verifyFiles = verifyRollbackFiles } = {}) {
  if (!plan?.ok) return failure("ROLLBACK_PLAN_INVALID");
  // Rebuild trusted argv: even a caller-mutated plan cannot supply commands or paths.
  plan = createRollbackPlan({ descriptor: plan.descriptor, descriptorPath: plan.descriptorPath });
  if (!plan.ok) return plan;
  const verified = verifyFiles(plan);
  if (!verified.ok) return verified;
  if (apply !== true) return { ok: true, applied: false, code: "ROLLBACK_PLAN_OK", mode: plan.descriptor.mode, services: plan.services };
  if (typeof run !== "function") return failure("ROLLBACK_RUNNER_REQUIRED");
  const environment = { PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin", ...plan.environment };
  for (const step of plan.steps) {
    const checked = verifyFiles(plan);
    if (!checked.ok) return checked;
    let result;
    try { result = run("docker", step.args, { env: environment, shell: false, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000, maxBuffer: 4 * 1024 * 1024 }); }
    catch { return failure("ROLLBACK_DOCKER_STEP_FAILED"); }
    if (result?.status !== 0 || result?.error || result?.signal) return failure("ROLLBACK_DOCKER_STEP_FAILED");
    if (step.name === "compose-model") {
      try { if (!verifyRollbackComposeModel(plan, JSON.parse(result.stdout ?? ""))) return failure("ROLLBACK_COMPOSE_MODEL_UNSAFE"); }
      catch { return failure("ROLLBACK_COMPOSE_MODEL_UNSAFE"); }
    }
  }
  return { ok: true, applied: true, code: "ROLLBACK_APPLIED", mode: plan.descriptor.mode, services: plan.services };
}
