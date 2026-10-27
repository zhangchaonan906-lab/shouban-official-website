import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isPrivateBindIp,
  runDeploymentChecks,
  validateTrustedProxyCidrs,
  type DeploymentCheckIo,
  type DeploymentCheckRunner
} from "../scripts/deployment/deployment-checks.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const canary = "SYNTHETIC_SECRET_MUST_NOT_BE_PRINTED";
const hash = (content: string) => createHash("sha256").update(content).digest("hex");

// Entirely synthetic command/file adapters. These tests never contact Docker,
// curl, the production domain, SMTP, Alibaba Cloud or a real server.
function fixture() {
  const releaseDir = resolve(root, "virtual/releases/v1");
  const runtime = resolve(releaseDir, "runtime.env");
  const gatewayConfig = resolve(releaseDir, "deploy/caddy/site.caddy");
  const env: Record<string, string> = {
    RELEASE_DIR: releaseDir,
    COMPOSE_PROJECT_NAME: "shouban-prod",
    COMPOSE_ENV_FILE: resolve(releaseDir, "compose.env"),
    SHOUBAN_IMAGE: "registry.company.cn/site@sha256:" + "a".repeat(64),
    SHOUBAN_GATEWAY_IMAGE: "registry.company.cn/caddy@sha256:" + "b".repeat(64),
    SHOUBAN_RUNTIME_ENV_FILE: runtime,
    SHOUBAN_RUNTIME_ENV_SHA256: hash(canary),
    SHOUBAN_GATEWAY_CONFIG: gatewayConfig,
    SHOUBAN_GATEWAY_CONFIG_SHA256: hash("synthetic gateway"),
    SHOUBAN_PROXY_NETWORK: "shouban-prod-proxy",
    SHOUBAN_BIND_IP: "172.17.33.17",
    SHOUBAN_GATEWAY_PORT: "18807",
    SHOUBAN_SITE_DOMAIN: "launch.company.cn",
    SHOUBAN_TRUSTED_PROXY_CIDRS: "172.17.33.0/24 100.64.0.0/10",
    ASSISTANT_CONTAINER: "existing-assistant",
    ALB_DNS_NAME: "alb-synthetic.cn-beijing.alb.aliyuncsslb.com"
  };
  const files = new Map([
    [runtime, { text: canary, mode: 0o100600 }],
    [gatewayConfig, { text: "synthetic gateway", mode: 0o100644 }],
    [env.COMPOSE_ENV_FILE, { text: "synthetic compose env", mode: 0o100600 }],
    [resolve(releaseDir, "deploy/compose.website.yml"), { text: "synthetic manifest", mode: 0o100644 }],
    [resolve(releaseDir, "deploy/compose.gateway.yml"), { text: "synthetic manifest", mode: 0o100644 }]
  ]);
  const common = {
    user: "1000:1000", read_only: true, cap_drop: ["ALL"], security_opt: ["no-new-privileges:true"],
    restart: "unless-stopped", logging: { driver: "json-file", options: { "max-size": "10m", "max-file": "3" } },
    healthcheck: { test: ["CMD", "synthetic-healthcheck"] },
    networks: { "shouban-proxy": {} }, cpus: 1, mem_limit: 1536 * 1024 * 1024,
    memswap_limit: 1536 * 1024 * 1024, pids_limit: 128
  };
  const model = {
    name: "shouban-prod",
    services: {
      website: {
        ...structuredClone(common), image: env.SHOUBAN_IMAGE,
        environment: { NEXT_PUBLIC_SITE_URL: "https://launch.company.cn", SHOUBAN_SITE_DOMAIN: "launch.company.cn", SMTP_PASS: canary }
      },
      gateway: {
        ...structuredClone(common), image: env.SHOUBAN_GATEWAY_IMAGE,
        cpus: 0.25, mem_limit: 128 * 1024 * 1024, memswap_limit: 128 * 1024 * 1024, pids_limit: 64,
        ports: [{ target: 8080, published: "18807", protocol: "tcp", host_ip: env.SHOUBAN_BIND_IP }],
        volumes: [{ type: "bind", source: gatewayConfig, target: "/etc/caddy/Caddyfile", read_only: true }],
        environment: { SHOUBAN_SITE_DOMAIN: env.SHOUBAN_SITE_DOMAIN, SHOUBAN_TRUSTED_PROXY_CIDRS: env.SHOUBAN_TRUSTED_PROXY_CIDRS }
      }
    },
    networks: { "shouban-proxy": { name: env.SHOUBAN_PROXY_NETWORK, external: true } }
  };
  const container = (service: "website" | "gateway", id: string) => ({
    id, state: "running", health: "healthy", image: model.services[service].image,
    user: "1000:1000", networks: { [env.SHOUBAN_PROXY_NETWORK]: {} }, ports: {},
    project: "shouban-prod", service, readOnly: true, capDrop: ["ALL"], securityOpt: ["no-new-privileges:true"],
    nanoCpus: model.services[service].cpus * 1e9, memory: model.services[service].mem_limit,
    memorySwap: model.services[service].memswap_limit, pids: model.services[service].pids_limit,
    restart: "unless-stopped", logging: { Type: "json-file", Config: { "max-size": "10m", "max-file": "3" } },
    mounts: [] as Record<string, unknown>[]
  });
  const website = container("website", "c".repeat(64));
  const gateway = {
    ...container("gateway", "d".repeat(64)),
    ports: { "8080/tcp": [{ HostIp: env.SHOUBAN_BIND_IP, HostPort: "18807" }] },
    mounts: [{ Type: "bind", Source: gatewayConfig, Destination: "/etc/caddy/Caddyfile", RW: false },
      { Type: "tmpfs", Destination: "/data", RW: true }]
  };
  const assistant = { state: "running", health: "healthy", networks: { "existing-backend": {} } };
  const members: Record<string, unknown> = { [website.id]: {}, [gateway.id]: {} };
  let memory = "MemAvailable: 5000000 kB\n";
  let diskFree = 15000000;
  let corruptJson = false;
  let dockerFailed = false;
  let responseChange: ((url: string, response: { status: string; headers: Record<string, string> }) => void) | undefined;
  const io: DeploymentCheckIo = {
    lstat(path) {
      const file = files.get(path);
      return { isSymbolicLink: () => false, isFile: () => Boolean(file), isDirectory: () => !file,
        mode: file?.mode ?? 0o40755, uid: process.getuid?.() ?? 0, nlink: 1, size: file?.text.length ?? 0 };
    },
    read(path) {
      if (path === "/proc/meminfo") return memory;
      const file = files.get(path);
      if (!file) throw new Error(canary);
      return file.text;
    },
    realpath: (path) => path
  };
  const calls: { program: string; args: string[]; options: Record<string, unknown> }[] = [];
  const ok = (value: unknown) => ({ status: 0, stdout: typeof value === "string" ? value : JSON.stringify(value) });
  const run: DeploymentCheckRunner = (program, args, options) => {
    calls.push({ program, args, options });
    if (program === "docker") {
      args = args.slice(2); // Fixed --host unix:///var/run/docker.sock prefix.
      if (dockerFailed) return { status: 1, stderr: canary };
      if (args.includes("config")) return corruptJson ? ok(canary) : ok(model);
      if (args[0] === "image") return ok("sha256:" + "e".repeat(64));
      if (args[0] === "inspect") {
        const id = args.at(-1);
        if (id === env.ASSISTANT_CONTAINER) return ok(assistant);
        if (id === website.id) return ok(website);
        if (id === gateway.id) return ok(gateway);
      }
      if (args.includes("ps")) return ok(args.at(-1) === "website" ? website.id : gateway.id);
      if (args[0] === "network") return ok(members);
      if (args[0] === "info") return ok(resolve("/var/lib/docker"));
    }
    if (program === "df") return ok("Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/synthetic 20000000 1 " + diskFree + " 1% /docker\n");
    if (program === "curl") {
      const url = args.at(-1)!;
      const response = {
        status: url.startsWith("http:") ? "301" : url.endsWith("/api/contact") ? "405" : "200",
        headers: { location: "https://launch.company.cn/", "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" }
      };
      responseChange?.(url, response);
      return ok("HTTP/1.1 " + response.status + " Synthetic\r\n" +
        Object.entries(response.headers).map(([key, value]) => key + ": " + value).join("\r\n") +
        "\r\n\r\nSHOUBAN_STATUS:" + response.status + "\n");
    }
    throw new Error("Unexpected synthetic command: " + program);
  };
  const check = (mode = "preflight", modelOnly = false) => runDeploymentChecks({ mode, modelOnly, env, run, io, platform: "linux" });
  return { env, model, website, gateway, assistant, members, files, io, run, calls, check,
    setMemory: (value: string) => { memory = value; }, setDisk: (value: number) => { diskFree = value; },
    breakJson: () => { corruptJson = true; }, failDocker: () => { dockerFailed = true; },
    setResponse: (change: NonNullable<typeof responseChange>) => { responseChange = change; }
  };
}

describe("read-only isolated gateway release checks", () => {
  it("checks the full synthetic runtime with an exact dedicated network", () => {
    const f = fixture();
    expect(f.check()).toBe("PREFLIGHT_READ_ONLY_OK_NOT_TRAFFIC_APPROVAL");
    const compose = f.calls.filter(({ args }) => args[2] === "compose");
    expect(compose).toHaveLength(3);
    for (const { args } of compose) {
      expect(args).toContain("shouban-prod");
      expect(args.filter((arg) => arg === "-f")).toHaveLength(2);
      expect(args).toContain(f.env.COMPOSE_ENV_FILE);
    }
    expect(f.calls.every(({ args }) => !args.some((arg) => ["up", "down", "run", "exec", "create", "connect", "pull", "load", "rm", "restart", "prune"].includes(arg)))).toBe(true);
  });

  it("labels model-only success without claiming a production deployment is ready", () => {
    const f = fixture();
    expect(f.check("preflight", true)).toBe("PREFLIGHT_MODEL_ONLY_OK_NOT_DEPLOYMENT_APPROVAL");
    expect(f.calls).toHaveLength(1);
  });

  it.each(["0.0.0.0", "127.0.0.1", "8.8.8.8", "::", "172.32.0.1", "100.64.0.1"])("rejects non-RFC1918 bind address %s", (ip) => {
    expect(isPrivateBindIp(ip)).toBe(false);
    const f = fixture(); f.env.SHOUBAN_BIND_IP = ip;
    expect(() => f.check("preflight", true)).toThrow("DEPLOYMENT_BIND_IP_NOT_PRIVATE");
    expect(f.calls).toHaveLength(0);
  });

  it.each(["0.0.0.0/0", "8.8.8.0/24", "172.16.0.0/11", "10.1.0.1/24", "100.0.0.0/9", "::/0", "10.0.0.0/8 10.0.0.0/8"])("rejects unsafe proxy CIDRs %s", (cidrs) => {
    expect(() => validateTrustedProxyCidrs(cidrs)).toThrow("DEPLOYMENT_TRUSTED_PROXY_CIDRS_INVALID");
  });

  it("accepts canonical approved private/ALB CIDRs", () => {
    expect(validateTrustedProxyCidrs("172.17.33.0/24 100.64.0.0/10")).toEqual(["172.17.33.0/24", "100.64.0.0/10"]);
  });

  it("rejects wrong project, mutable images, exposed runtime permissions and file drift before Docker", () => {
    for (const change of [
      (f: ReturnType<typeof fixture>) => { f.env.COMPOSE_PROJECT_NAME = "another-project"; },
      (f: ReturnType<typeof fixture>) => { f.env.SHOUBAN_IMAGE = "registry.company.cn/site:latest"; },
      (f: ReturnType<typeof fixture>) => { f.files.get(f.env.SHOUBAN_RUNTIME_ENV_FILE)!.mode = 0o100644; },
      (f: ReturnType<typeof fixture>) => { f.files.get(f.env.SHOUBAN_RUNTIME_ENV_FILE)!.text = "modified"; }
    ]) {
      const f = fixture(); change(f);
      expect(() => f.check("preflight", true)).toThrow();
      expect(f.calls).toHaveLength(0);
    }
  });

  it("refuses symlinked version files and paths outside the retained release", () => {
    const f = fixture();
    f.io.lstat = () => ({ isSymbolicLink: () => true, isFile: () => true, isDirectory: () => false, mode: 0o100600, uid: 0, nlink: 1, size: 1 });
    expect(() => f.check("preflight", true)).toThrow("DEPLOYMENT_FILE_NOT_IMMUTABLE_REGULAR");
    const other = fixture(); other.env.SHOUBAN_RUNTIME_ENV_FILE = resolve(other.env.RELEASE_DIR, "../other/runtime.env");
    expect(() => other.check("preflight", true)).toThrow("DEPLOYMENT_FILE_OUTSIDE_RELEASE");
  });

  it("rejects hardlinks, oversized files and writable ancestor directories", () => {
    for (const change of ["hardlink", "size", "directory"]) {
      const f = fixture();
      const original = f.io.lstat;
      f.io.lstat = (path) => {
        const stat = original(path);
        if (path === f.env.SHOUBAN_RUNTIME_ENV_FILE && change === "hardlink") return { ...stat, nlink: 2 };
        if (path === f.env.SHOUBAN_RUNTIME_ENV_FILE && change === "size") return { ...stat, size: 1024 * 1024 + 1 };
        if (path === dirname(f.env.SHOUBAN_RUNTIME_ENV_FILE) && change === "directory") return { ...stat, mode: 0o40777 };
        return stat;
      };
      expect(() => f.check("preflight", true)).toThrow(/DEPLOYMENT_(?:FILE_LINK_OR_SIZE_INVALID|DIRECTORY_PERMISSIONS_UNSAFE)/);
      expect(f.calls).toHaveLength(0);
    }
  });

  it("pins the local socket and does not inherit command, proxy or secret environment overrides", () => {
    const f = fixture();
    Object.assign(f.env, { DOCKER_HOST: "ssh://unapproved.company.cn", DOCKER_CONTEXT: "remote", COMPOSE_FILE: "wrong.yml", SMTP_PASS: canary, HTTPS_PROXY: "http://unapproved.company.cn" });
    f.check();
    for (const { program, args, options } of f.calls) {
      if (program === "docker") expect(args.slice(0, 2)).toEqual(["--host", "unix:///var/run/docker.sock"]);
      const childEnv = options.env as Record<string, string>;
      for (const key of ["DOCKER_HOST", "DOCKER_CONTEXT", "COMPOSE_FILE", "SMTP_PASS", "HTTPS_PROXY"]) expect(childEnv[key]).toBeUndefined();
    }
  });

  it("does not use local workstation resource metrics as Linux host proof", () => {
    const f = fixture();
    expect(() => runDeploymentChecks({ mode: "preflight", env: f.env, run: f.run, io: f.io, platform: "win32" })).toThrow("PREFLIGHT_LOCAL_LINUX_HOST_REQUIRED");
    expect(f.calls).toHaveLength(1);
  });

  it("rejects unsafe resolved models semantically", () => {
    const mutations: ((f: ReturnType<typeof fixture>) => void)[] = [
      (f) => { f.model.services.gateway.ports[0].host_ip = "0.0.0.0"; },
      (f) => { f.model.services.gateway.ports.push({ ...f.model.services.gateway.ports[0], published: "18808" }); },
      (f) => { Object.assign(f.model.services.website, { ports: [{ target: 3000, published: "3000" }] }); },
      (f) => { Object.assign(f.model.services.website, { command: ["node", "server.js"] }); },
      (f) => { Object.assign(f.model.services.website, { networks: { "existing-backend": {} } }); },
      (f) => { f.model.services.website.mem_limit = 0; },
      (f) => { f.model.services.website.read_only = false; },
      (f) => { f.model.services.gateway.user = "root"; },
      (f) => { f.model.services.gateway.volumes[0].read_only = false; },
      (f) => { f.model.services.website.environment.NEXT_PUBLIC_SITE_URL = "https://other.company.cn"; }
    ];
    for (const mutate of mutations) {
      const f = fixture(); mutate(f);
      expect(() => f.check("preflight", true)).toThrow(/PREFLIGHT_/);
    }
  });

  it.each(["command", "entrypoint", "cap_add", "devices", "pid", "ipc", "extra_hosts", "volumes_from"])("refuses dangerous gateway override %s", (key) => {
    const f = fixture();
    Object.assign(f.model.services.gateway, { [key]: ["forbidden"] });
    expect(() => f.check("preflight", true)).toThrow("PREFLIGHT_SERVICE_OVERRIDE_FORBIDDEN");
  });

  it("rejects a top-level shared volume declaration", () => {
    const f = fixture(); Object.assign(f.model, { volumes: { "existing-data": { external: true } } });
    expect(() => f.check("preflight", true)).toThrow("PREFLIGHT_COMPOSE_SHARED_RESOURCE_INVALID");
  });

  it("rejects unhealthy assistants, extra network members and actual container drift", () => {
    const mutations: ((f: ReturnType<typeof fixture>) => void)[] = [
      (f) => { f.assistant.health = "unhealthy"; },
      (f) => { Object.assign(f.assistant.networks, { [f.env.SHOUBAN_PROXY_NETWORK]: {} }); },
      (f) => { f.members["e".repeat(64)] = {}; },
      (f) => { Object.assign(f.website.ports, { "3000/tcp": [{ HostIp: "0.0.0.0", HostPort: "3000" }] }); },
      (f) => { Object.assign(f.website.networks, { "existing-backend": {} }); },
      (f) => { f.gateway.ports["8080/tcp"][0].HostIp = "0.0.0.0"; },
      (f) => { f.gateway.image = "unapproved"; },
      (f) => { f.website.project = "other"; },
      (f) => { f.website.memory = 0; },
      (f) => { f.gateway.mounts[0].RW = true; }
    ];
    for (const mutate of mutations) {
      const f = fixture(); mutate(f);
      expect(() => f.check()).toThrow(/PREFLIGHT_/);
    }
  });

  it("enforces disk and memory thresholds without freeing resources", () => {
    const f = fixture(); f.setDisk(10485759);
    expect(() => f.check()).toThrow("PREFLIGHT_DOCKER_DISK_BELOW_10_GIB");
    const g = fixture(); g.setMemory("MemAvailable: 3670015 kB\n");
    expect(() => g.check()).toThrow("PREFLIGHT_MEMORY_BELOW_3_5_GIB");
  });

  it("never includes captured Docker output or secrets in command/JSON errors", () => {
    for (const broken of ["json", "command"]) {
      const f = fixture();
      if (broken === "json") f.breakJson(); else f.failDocker();
      try { f.check(); throw new Error("expected failure"); }
      catch (error) {
        expect((error as Error).message).toBe("PREFLIGHT_COMPOSE_INVALID");
        expect(String(error)).not.toContain(canary);
      }
    }
  });

  it("executes pre-DNS GET checks with canonical TLS SNI/Host and bounded curl", () => {
    const f = fixture();
    expect(f.check("acceptance")).toBe("ACCEPTANCE_READ_ONLY_OK mode=pre-dns");
    const curls = f.calls.filter(({ program }) => program === "curl");
    expect(curls).toHaveLength(5);
    for (const { args, options } of curls) {
      const protocol = args.at(-1)!.startsWith("https:") ? "443" : "80";
      expect(args).toContain(`launch.company.cn:${protocol}:${f.env.ALB_DNS_NAME}:${protocol}`);
      expect(args).toContain("--connect-timeout"); expect(args).toContain("--max-time");
      expect(args).toContain("GET"); expect(args).not.toContain("--insecure"); expect(args).not.toContain("--location");
      expect(options.timeout).toBe(20000);
    }
  });

  it("performs explicit public-DNS checks without a pre-DNS connection override", () => {
    const f = fixture(); f.env.ACCEPTANCE_MODE = "public";
    expect(f.check("acceptance")).toBe("ACCEPTANCE_READ_ONLY_OK mode=public");
    expect(f.calls.filter(({ program }) => program === "curl").every(({ args }) => !args.includes("--connect-to"))).toBe(true);
  });

  it("supports the older approved ALB DNS suffix", () => {
    const f = fixture(); f.env.ALB_DNS_NAME = "alb-synthetic.cn-beijing.alb.aliyuncs.com";
    expect(f.check("acceptance")).toBe("ACCEPTANCE_READ_ONLY_OK mode=pre-dns");
  });

  it("rejects wrong canonical redirects, cache headers and API status", () => {
    for (const change of [
      (url: string, response: { headers: Record<string, string> }) => { if (url.startsWith("http:")) response.headers.location = "https://other.company.cn/"; },
      (url: string, response: { headers: Record<string, string> }) => { if (url.endsWith("/contact")) response.headers["cache-control"] = "private-foo, no-store"; },
      (url: string, response: { status: string }) => { if (url.endsWith("/api/contact")) response.status = "503"; }
    ]) {
      const f = fixture(); f.setResponse(change);
      expect(() => f.check("acceptance")).toThrow(/ACCEPTANCE_/);
    }
  });

  it("fails closed in the real CLI without printing an invalid input value", () => {
    const result = spawnSync(process.execPath, [resolve(root, "scripts/deployment/deployment-checks.mjs"), "preflight", "--model-only"], {
      encoding: "utf8", env: { ...process.env, RELEASE_DIR: canary }, timeout: 10000, windowsHide: true
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/^(?:DEPLOYMENT_RELEASE_DIR_INVALID|DEPLOYMENT_NODE_24_REQUIRED)\r?\n$/);
    expect(result.stderr).not.toContain(canary);
  });

  it("runs the real model CLI against a fake Docker process adapter and refuses its unsafe model", () => {
    const f = fixture();
    f.model.services.gateway.ports[0].host_ip = "0.0.0.0";
    const directories: string[] = [];
    for (let current = f.env.RELEASE_DIR;; current = dirname(current)) {
      directories.push(current);
      if (dirname(current) === current) break;
    }
    directories.push(dirname(f.env.SHOUBAN_GATEWAY_CONFIG), dirname(dirname(f.env.SHOUBAN_GATEWAY_CONFIG)), dirname(f.env.SHOUBAN_RUNTIME_ENV_FILE));
    const preload = `
      import fs from 'node:fs';
      import child from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      const files = new Map(${JSON.stringify([...f.files])});
      const directories = new Set(${JSON.stringify(directories)});
      const original = { lstat: fs.lstatSync, read: fs.readFileSync, realpath: fs.realpathSync };
      fs.lstatSync = (path, ...args) => {
        const file = files.get(String(path));
        if (file || directories.has(String(path))) return {
          isSymbolicLink: () => false, isFile: () => Boolean(file), isDirectory: () => !file,
          mode: file?.mode ?? 0o40755, uid: process.getuid?.() ?? 0, nlink: 1, size: file?.text.length ?? 0
        };
        return original.lstat(path, ...args);
      };
      fs.realpathSync = (path, ...args) => files.has(String(path)) || directories.has(String(path)) ? String(path) : original.realpath(path, ...args);
      fs.readFileSync = (path, ...args) => files.has(String(path)) ? files.get(String(path)).text : original.read(path, ...args);
      child.spawnSync = (program, args) => {
        if (program === 'docker' && args.includes('config')) return { status: 0, stdout: ${JSON.stringify(JSON.stringify(f.model))} };
        throw new Error('${canary}');
      };
      syncBuiltinESMExports();
    `;
    const result = spawnSync(process.execPath, ["--import", "data:text/javascript;base64," + Buffer.from(preload).toString("base64"),
      resolve(root, "scripts/deployment/deployment-checks.mjs"), "preflight", "--model-only"], {
      encoding: "utf8", env: { ...process.env, ...f.env }, timeout: 10000, windowsHide: true
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/^(?:PREFLIGHT_GATEWAY_PORT_INVALID|DEPLOYMENT_NODE_24_REQUIRED)\r?\n$/);
    expect(result.stderr).not.toContain(canary);
  });
});
