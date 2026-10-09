import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
