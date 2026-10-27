import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createRollbackPlan,
  executeRollback,
  loadRollbackPlan,
  verifyRollbackComposeModel,
  verifyRollbackFiles,
  type ReleaseDescriptor,
  type RollbackIo,
  type RollbackPlan
} from "../scripts/deployment/rollback-plan.mjs";

const root = "/opt/shouban/releases/v17";
const descriptorPath = `${root}/release.json`;
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const image = (name: string, digit: string) => `registry.sbrz.com.cn/${name}@sha256:${digit.repeat(64)}`;

function fixture(mode: "website" | "maintenance" = "website") {
  const data: Record<string, string> = {
    runtimeEnv: "NEXT_PUBLIC_SITE_URL=https://sbrz.com.cn\nSHOUBAN_SITE_DOMAIN=sbrz.com.cn\nSMTP_PASS=SYNTHETIC_TEST_SECRET\n",
    websiteManifest: "services:\n  website:\n    image: ${SHOUBAN_IMAGE}\n",
    gatewayManifest: "services:\n  gateway:\n    image: ${SHOUBAN_GATEWAY_IMAGE}\n",
    gatewayConfig: `{\n admin off\n auto_https off\n}\n:8080 {\n host {$SHOUBAN_SITE_DOMAIN}\n remote_ip {$SHOUBAN_TRUSTED_PROXY_CIDRS}\n ${mode === "website" ? "reverse_proxy shouban-website:3000" : 'respond "Unavailable" 503'}\n}\n`,
    composeEnv: ""
  };
  const descriptor: ReleaseDescriptor = {
    schemaVersion: 1, project: "shouban-prod", releaseId: "v17", mode,
    siteOrigin: "https://sbrz.com.cn", siteDomain: "sbrz.com.cn",
    proxyNetwork: "shouban-prod-proxy", privateBindIp: "172.18.0.20", gatewayPort: 18807,
    albDnsName: "test-alb.cn-beijing.alb.aliyuncsslb.com", trustedProxyCidrs: ["172.18.0.0/24", "100.64.0.0/24"],
    gatewayImage: image("gateway", "b"),
    files: {
      composeEnv: { path: `${root}/config/compose.env`, sha256: hash("") },
      websiteManifest: { path: `${root}/deploy/compose.website.yml`, sha256: hash(data.websiteManifest) },
      gatewayManifest: { path: `${root}/deploy/compose.gateway.yml`, sha256: hash(data.gatewayManifest) },
      gatewayConfig: { path: `${root}/config/gateway.caddy`, sha256: hash(data.gatewayConfig) }
    }
  };
  if (mode === "website") {
    descriptor.websiteImage = image("website", "a");
    descriptor.files.runtimeEnv = { path: `${root}/config/runtime.env`, sha256: hash(data.runtimeEnv) };
  }
  function planFor(d = descriptor) {
    const plan = createRollbackPlan({ descriptor: d, descriptorPath });
    if (!plan.ok) throw new Error(plan.code);
    return plan;
  }
  data.composeEnv = Object.entries(planFor().environment).map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
  descriptor.files.composeEnv.sha256 = hash(data.composeEnv);
  const files = new Map<string, string>(Object.entries(descriptor.files).map(([key, file]) => [file!.path, data[key]]));
  files.set(descriptorPath, JSON.stringify(descriptor));
  const metadata = new Map<string, Partial<{ mode: number; uid: number; nlink: number; symlink: boolean; realpath: string }>>();
  const io: RollbackIo = {
    platform: "linux", uid: 1000,
    lstatSync(path) {
      const file = files.has(path);
      const overrides = metadata.get(path) ?? {};
      return { mode: file ? 0o600 : 0o755, uid: 1000, nlink: 1, size: files.get(path)?.length ?? 0, ...overrides,
        isDirectory: () => !file, isFile: () => file, isSymbolicLink: () => overrides.symlink ?? false };
    },
    realpathSync: (path) => metadata.get(path)?.realpath ?? path,
    readFileSync(path, encoding) {
      const content = files.get(path);
      if (content === undefined) throw new Error("SYNTHETIC_TEST_SECRET");
      return encoding ? content : Buffer.from(content);
    }
  };
  const plan = planFor();
  const model = {
    name: "shouban-prod",
    networks: { "shouban-proxy": { name: descriptor.proxyNetwork, external: true } },
    services: Object.fromEntries(plan.services.map((name) => [name, {
      user: "1000:1000", read_only: true, restart: "unless-stopped", cap_drop: ["ALL"], security_opt: ["no-new-privileges:true"],
      init: true, mem_limit: 128 * 1024 * 1024, memswap_limit: 128 * 1024 * 1024, cpus: 0.25, pids_limit: 64,
      tmpfs: (name === "gateway" ? ["/tmp", "/config", "/data"] : ["/tmp", "/app/.next/cache"]).map((path) => `${path}:rw,noexec,nosuid,nodev,size=8m`),
      healthcheck: { test: name === "gateway" ? ["CMD", "wget", "-q", "-T", "3", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"] : ["CMD", "node", "/app/scripts/deployment/healthcheck.mjs"] }, logging: { driver: "json-file", options: { "max-size": "10m", "max-file": "3" } },
      networks: { "shouban-proxy": {} },
      image: name === "website" ? descriptor.websiteImage : descriptor.gatewayImage,
      environment: name === "website" ? { NEXT_PUBLIC_SITE_URL: descriptor.siteOrigin, SHOUBAN_SITE_DOMAIN: descriptor.siteDomain } : { SHOUBAN_SITE_DOMAIN: descriptor.siteDomain, SHOUBAN_TRUSTED_PROXY_CIDRS: descriptor.trustedProxyCidrs.join(" ") },
      ...(name === "gateway" ? { ports: [{ target: 8080, published: "18807", host_ip: descriptor.privateBindIp, protocol: "tcp" }], volumes: [{ type: "bind", source: descriptor.files.gatewayConfig.path, target: "/etc/caddy/Caddyfile", read_only: true, bind: { create_host_path: false } }] } : {})
    }]))
  };
  const verifyFiles = (p: RollbackPlan) => verifyRollbackFiles(p, io);
  return { descriptor, plan, files, io, metadata, model, verifyFiles };
}

describe("protected grouped release rollback", () => {
  it("loads and checks a protected versioned group without invoking Docker by default", () => {
    const f = fixture();
    const run = vi.fn();
    expect(loadRollbackPlan(descriptorPath, f.io)).toEqual(f.plan);
    expect(executeRollback(f.plan, { run, verifyFiles: f.verifyFiles })).toEqual({ ok: true, applied: false, code: "ROLLBACK_PLAN_OK", mode: "website", services: ["website", "gateway"] });
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    ["project", "other-project"], ["releaseId", "current"], ["mode", "shell"],
    ["siteOrigin", "https://preview.invalid"], ["siteOrigin", "https://different.com"],
    ["siteDomain", "sbrz.com.cn;echo secret"], ["albDnsName", "127.0.0.1"],
    ["proxyNetwork", "assistant-default"], ["privateBindIp", "0.0.0.0"],
    ["privateBindIp", "203.0.113.2"], ["gatewayPort", 443], ["gatewayPort", 65536],
    ["trustedProxyCidrs", ["0.0.0.0/0"]], ["trustedProxyCidrs", ["8.8.8.0/24"]],
    ["trustedProxyCidrs", ["172.18.0.1/24"]], ["trustedProxyCidrs", ["10.0.0.0/8", "10.0.0.0/8"]],
    ["gatewayImage", "registry.sbrz.com.cn/gateway:latest"], ["websiteImage", "registry.sbrz.com.cn/site:abcdef1234"],
    ["command", "/bin/sh"]
  ])("rejects unsafe descriptor field %s", (key, value) => {
    const f = fixture();
    expect(createRollbackPlan({ descriptor: { ...f.descriptor, [key]: value }, descriptorPath }).ok).toBe(false);
  });

  it.each(["/opt/shouban/releases/current/release.json", "/opt/shouban/releases/v17/../v17/release.json", "release.json", "/opt/shouban/releases/v17//release.json"]) ("rejects unsafe descriptor path %s", (path) => {
    expect(createRollbackPlan({ descriptor: fixture().descriptor, descriptorPath: path }).ok).toBe(false);
  });

  it("rejects cross-release, duplicate, injected mount, or incorrectly hashed file metadata", () => {
    const f = fixture();
    for (const path of ["/etc/runtime.env", "/opt/shouban/releases/v16/runtime.env", `${root}/config/../runtime.env`, `${root}/config/evil,readonly.env`]) {
      const descriptor = structuredClone(f.descriptor);
      descriptor.files.runtimeEnv!.path = path;
      expect(createRollbackPlan({ descriptor, descriptorPath }).ok).toBe(false);
    }
    f.descriptor.files.runtimeEnv = { ...f.descriptor.files.composeEnv };
    expect(createRollbackPlan({ descriptor: f.descriptor, descriptorPath }).ok).toBe(false);
  });

  it.each([
    ["file-symlink", `${root}/config/runtime.env`, { symlink: true }],
    ["directory-symlink", `${root}/config`, { symlink: true }],
    ["redirected-realpath", `${root}/config/runtime.env`, { realpath: "/etc/secret.env" }],
    ["world-writable-directory", "/opt/shouban", { mode: 0o777 }],
    ["group-readable-runtime", `${root}/config/runtime.env`, { mode: 0o640 }],
    ["group-writable-manifest", `${root}/deploy/compose.website.yml`, { mode: 0o664 }],
    ["untrusted-owner", descriptorPath, { uid: 2000 }],
    ["hardlink", `${root}/config/runtime.env`, { nlink: 2 }]
  ])("fails closed for %s", (_label, path, metadata) => {
    const f = fixture();
    f.metadata.set(path, metadata);
    expect(f.verifyFiles(f.plan)).toEqual({ ok: false, code: "ROLLBACK_FILE_PROTECTION_INVALID" });
  });

  it("rejects changed files and changed descriptors before any Docker command", () => {
    for (const file of [descriptorPath, ...Object.values(fixture().descriptor.files).map((value) => value!.path)]) {
      const f = fixture();
      f.files.set(file, f.files.get(file) + "SYNTHETIC_TEST_SECRET");
      const run = vi.fn();
      const result = executeRollback(f.plan, { apply: true, run, verifyFiles: f.verifyFiles });
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toContain("SYNTHETIC_TEST_SECRET");
      expect(run).not.toHaveBeenCalled();
    }
  });

  it("rejects environment or Origin binding drift even with recalculated file hashes", () => {
    for (const key of ["runtimeEnv", "composeEnv"] as const) {
      const f = fixture();
      const file = f.descriptor.files[key]!;
      const content = f.files.get(file.path)!.replace(key === "runtimeEnv" ? "https://sbrz.com.cn" : "SHOUBAN_BIND_IP=172.18.0.20", key === "runtimeEnv" ? "https://other.com" : "SHOUBAN_BIND_IP=0.0.0.0");
      file.sha256 = hash(content);
      f.files.set(file.path, content);
      if (key === "runtimeEnv") {
        const compose = f.descriptor.files.composeEnv;
        const env = f.files.get(compose.path)!.replace(/^SHOUBAN_RUNTIME_ENV_SHA256=.*$/m, `SHOUBAN_RUNTIME_ENV_SHA256=${file.sha256}`);
        f.files.set(compose.path, env);
        compose.sha256 = hash(env);
      }
      f.files.set(descriptorPath, JSON.stringify(f.descriptor));
      const plan = createRollbackPlan({ descriptor: f.descriptor, descriptorPath });
      if (!plan.ok) throw new Error(plan.code);
      expect(f.verifyFiles(plan)).toEqual({ ok: false, code: key === "runtimeEnv" ? "ROLLBACK_ORIGIN_BINDING_MISMATCH" : "ROLLBACK_ENV_BINDING_MISMATCH" });
    }
  });

  it("runs fixed local Docker argv, isolated checks, and only the grouped target services", () => {
    const f = fixture();
    const run = vi.fn((_command, args) => ({ status: 0, stdout: args.includes("--format") ? JSON.stringify(f.model) : "SYNTHETIC_TEST_SECRET" }));
    vi.stubEnv("DOCKER_HOST", "tcp://untrusted:2375");
    vi.stubEnv("COMPOSE_PROJECT_NAME", "assistant");
    vi.stubEnv("SHOUBAN_BIND_IP", "0.0.0.0");
    try {
      expect(executeRollback(f.plan, { apply: true, run, verifyFiles: f.verifyFiles })).toEqual({ ok: true, applied: true, code: "ROLLBACK_APPLIED", mode: "website", services: ["website", "gateway"] });
      expect(run).toHaveBeenCalledTimes(6);
      for (const [command, args, options] of run.mock.calls as unknown as [string, string[], { shell: boolean; env: Record<string, string> }][]) {
        expect(command).toBe("docker");
        expect(args.slice(0, 2)).toEqual(["--host", "unix:///var/run/docker.sock"]);
        expect(options.shell).toBe(false);
        expect(options.env.COMPOSE_PROJECT_NAME).toBe("shouban-prod");
        expect(options.env.SHOUBAN_BIND_IP).toBe("172.18.0.20");
        expect(options.env.DOCKER_HOST).toBeUndefined();
        expect(args).not.toContain("down");
      }
      for (const name of ["release-check", "origin-check"]) {
        const args = f.plan.steps.find((step) => step.name === name)!.args;
        expect(args.slice(args.indexOf("--network"), args.indexOf("--network") + 2)).toEqual(["--network", "none"]);
        expect(args).not.toContain("server.js");
      }
      expect(f.plan.steps.at(-1)!.args.slice(-2)).toEqual(["website", "gateway"]);
      expect(f.plan.steps.at(-1)!.args).toContain("--wait");
    } finally { vi.unstubAllEnvs(); }
  });

  it.each([0, 1, 2, 3, 4, 5])("stops on failed step %s and redacts command output", (failedStep) => {
    const f = fixture();
    let index = 0;
    const run = vi.fn((_command, args) => ({ status: index++ === failedStep ? 1 : 0, stdout: args.includes("--format") ? JSON.stringify(f.model) : "SYNTHETIC_TEST_SECRET", stderr: "SYNTHETIC_TEST_SECRET" }));
    const result = executeRollback(f.plan, { apply: true, run, verifyFiles: f.verifyFiles });
    expect(result).toEqual({ ok: false, code: "ROLLBACK_DOCKER_STEP_FAILED" });
    expect(run).toHaveBeenCalledTimes(failedStep + 1);
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_TEST_SECRET");
  });

  it("rechecks the protected group before each command and blocks drift before up", () => {
    const f = fixture();
    const run = vi.fn((_command, args) => {
      if (args.includes("validate")) f.files.set(f.descriptor.files.gatewayConfig.path, "changed");
      return { status: 0, stdout: args.includes("--format") ? JSON.stringify(f.model) : "" };
    });
    expect(executeRollback(f.plan, { apply: true, run, verifyFiles: f.verifyFiles })).toEqual({ ok: false, code: "ROLLBACK_FILE_HASH_MISMATCH" });
    expect(run).toHaveBeenCalledTimes(5);
  });

  it("rebuilds argv from the descriptor and ignores mutated plan commands", () => {
    const f = fixture("maintenance");
    f.plan.steps = [{ name: "up", args: ["compose", "--project-name", "assistant", "down"] }];
    f.plan.environment.SHOUBAN_BIND_IP = "0.0.0.0";
    const run = vi.fn((_command, args) => ({ status: 0, stdout: args.includes("--format") ? JSON.stringify(f.model) : "" }));
    expect(executeRollback(f.plan, { apply: true, run, verifyFiles: f.verifyFiles }).ok).toBe(true);
    expect(run).toHaveBeenCalledTimes(4);
    expect(run.mock.calls.some((call) => call[1].includes("down"))).toBe(false);
  });

  it("redacts exceptions and malformed secret-bearing Compose output", () => {
    const f = fixture();
    const throwingRun = vi.fn(() => { throw new Error("SYNTHETIC_TEST_SECRET"); });
    expect(executeRollback(f.plan, { apply: true, run: throwingRun, verifyFiles: f.verifyFiles })).toEqual({ ok: false, code: "ROLLBACK_DOCKER_STEP_FAILED" });
    const malformedRun = vi.fn(() => ({ status: 0, stdout: "SYNTHETIC_TEST_SECRET" }));
    expect(executeRollback(f.plan, { apply: true, run: malformedRun, verifyFiles: f.verifyFiles })).toEqual({ ok: false, code: "ROLLBACK_COMPOSE_MODEL_UNSAFE" });
    expect(malformedRun).toHaveBeenCalledTimes(2);
  });

  it("rejects unapproved Compose services, public bindings, mounts, images and privilege", () => {
    const f = fixture();
    expect(verifyRollbackComposeModel(f.plan, f.model)).toBe(true);
    const mutations = [
      (m: any) => { m.services.assistant = m.services.gateway; },
      (m: any) => { m.services.gateway.ports[0].host_ip = "0.0.0.0"; },
      (m: any) => { m.services.gateway.volumes[0].source = "/var/run/docker.sock"; },
      (m: any) => { m.services.website.image = "site:latest"; },
      (m: any) => { m.services.gateway.privileged = true; },
      (m: any) => { m.services.gateway.command = ["sh", "-c", "unsafe"]; },
      (m: any) => { m.services.gateway.mem_limit = 0; },
      (m: any) => { m.services.website.logging.options["max-file"] = "100"; },
      (m: any) => { m.services.gateway.tmpfs = ["/var/run:rw,noexec,nosuid,nodev"]; },
      (m: any) => { m.services.gateway.healthcheck.test = ["CMD", "unsafe"]; },
      (m: any) => { m.networks["shouban-proxy"].name = "assistant-default"; }
    ];
    for (const mutate of mutations) {
      const model = structuredClone(f.model);
      mutate(model);
      expect(verifyRollbackComposeModel(f.plan, model)).toBe(false);
      const run = vi.fn((_command, args) => ({ status: 0, stdout: args.includes("--format") ? JSON.stringify(model) : "" }));
      expect(executeRollback(f.plan, { apply: true, run, verifyFiles: f.verifyFiles })).toEqual({ ok: false, code: "ROLLBACK_COMPOSE_MODEL_UNSAFE" });
      expect(run).toHaveBeenCalledTimes(2);
    }
  });

  it("supports first-launch maintenance without runtime secrets, website image, or privacy proof", () => {
    const f = fixture("maintenance");
    const run = vi.fn((_command, args) => ({ status: 0, stdout: args.includes("--format") ? JSON.stringify(f.model) : "" }));
    expect(f.plan.descriptor.websiteImage).toBeUndefined();
    expect(f.plan.descriptor.files.runtimeEnv).toBeUndefined();
    expect(executeRollback(f.plan, { apply: true, run, verifyFiles: f.verifyFiles })).toEqual({ ok: true, applied: true, code: "ROLLBACK_APPLIED", mode: "maintenance", services: ["gateway"] });
    expect(run).toHaveBeenCalledTimes(4);
    expect(f.plan.steps.some((step) => ["release-check", "origin-check"].includes(step.name))).toBe(false);
    for (const step of f.plan.steps) expect(step.args).not.toContain(f.descriptor.files.websiteManifest.path);
    expect(f.plan.steps.at(-1)!.args.at(-1)).toBe("gateway");
  });

  it("retires the unsafe legacy command generator with an explicit migration failure", () => {
    expect(createRollbackPlan({ previousRelease: { image: image("website", "a"), runtimeEnvFile: `${root}/config/runtime.env`, runtimeEnvSha256: "a".repeat(64) }, composeFile: "/opt/site/compose.website.yml", proxyNetwork: "shouban-proxy" })).toEqual({ ok: false, code: "ROLLBACK_LEGACY_DESCRIPTOR_REQUIRED" });
  });

  it("fails closed when POSIX permissions cannot be checked", () => {
    const f = fixture();
    expect(loadRollbackPlan(descriptorPath, { ...f.io, platform: "win32" })).toEqual({ ok: false, code: "ROLLBACK_LINUX_REQUIRED" });
  });

  it("requires an exact --apply CLI flag and prints only safe result codes", async () => {
    const { runRollbackCli } = await import(new URL("../scripts/deployment/rollback.mjs", import.meta.url).href);
    const f = fixture("maintenance");
    const write = vi.fn();
    const load = vi.fn(() => f.plan);
    const execute = vi.fn((_plan, options) => ({ ok: true, applied: options.apply, code: "ROLLBACK_PLAN_OK", mode: "maintenance", services: ["gateway"] }));
    expect(runRollbackCli(["--descriptor", descriptorPath], { load, execute, write })).toBe(0);
    expect(execute.mock.calls[0][1].apply).toBe(false);
    expect(runRollbackCli(["--descriptor", descriptorPath, "--apply"], { load, execute, write })).toBe(0);
    expect(execute.mock.calls[1][1].apply).toBe(true);
    for (const args of [["--apply"], ["--descriptor", descriptorPath, "--apply=yes"], ["--descriptor", descriptorPath, "--apply", "--extra"]]) expect(runRollbackCli(args, { load, execute, write })).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
