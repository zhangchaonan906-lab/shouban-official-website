import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const buildSiteOriginPath = fileURLToPath(
  new URL("../.build-site-origin", import.meta.url)
);
let buildSiteOrigin;
try {
  buildSiteOrigin = readFileSync(buildSiteOriginPath, "utf8").trim();
} catch {
  process.stderr.write("CONTAINER_BUILD_SITE_ORIGIN_MISSING\n");
  process.exit(1);
}

if (
  buildSiteOrigin === "" ||
  process.env.NEXT_PUBLIC_SITE_URL !== buildSiteOrigin
) {
  process.stderr.write("CONTAINER_SITE_ORIGIN_MISMATCH\n");
  process.exit(1);
}

const releaseCheckPath = fileURLToPath(
  new URL("./privacy-release-check.mjs", import.meta.url)
);
const releaseCheck = spawnSync(process.execPath, [releaseCheckPath], {
  stdio: "inherit"
});

if (releaseCheck.error) {
  process.stderr.write("CONTAINER_RELEASE_CHECK_EXEC_FAILED\n");
  process.exit(1);
}

if (releaseCheck.status !== 0) {
  process.exit(releaseCheck.status ?? 1);
}

const serverPath = fileURLToPath(new URL("../server.js", import.meta.url));
const server = spawn(process.execPath, [serverPath], {
  stdio: "inherit"
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.kill(signal);
  });
}

server.once("error", () => {
  process.stderr.write("CONTAINER_SERVER_START_FAILED\n");
  process.exitCode = 1;
});

server.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
