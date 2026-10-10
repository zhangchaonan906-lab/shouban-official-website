import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

export function runGatedStart({
  runReleaseCheck,
  checkSiteOrigin,
  startServer
}) {
  const releaseStatus = runReleaseCheck();
  if (releaseStatus !== 0) {
    return { started: false, exitCode: releaseStatus || 1 };
  }

  const originStatus = checkSiteOrigin();
  if (originStatus !== 0) {
    return { started: false, exitCode: originStatus || 1 };
  }

  return {
    started: true,
    exitCode: 0,
    startResult: startServer()
  };
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error) {
    process.stderr.write("STANDALONE_START_CHECK_FAILED\n");
    return 1;
  }
  return result.status ?? 1;
}

function launchServer() {
  return new Promise((resolveExit) => {
    const child = spawn(process.execPath, ["server.js"], {
      stdio: "inherit",
      env: process.env
    });

    const forwardSignal = (signal) => child.kill(signal);
    const signals = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.once(signal, forwardSignal);
    }

    child.once("error", () => {
      for (const signal of signals) {
        process.removeListener(signal, forwardSignal);
      }
      process.stderr.write("STANDALONE_SERVER_START_FAILED\n");
      resolveExit(1);
    });

    child.once("exit", (code, signal) => {
      for (const forwardedSignal of signals) {
        process.removeListener(forwardedSignal, forwardSignal);
      }
      resolveExit(code ?? (signal ? 1 : 0));
    });
  });
}

async function main() {
  const originCheckPath = fileURLToPath(
    new URL("./check-built-site-origin.mjs", import.meta.url)
  );

  const decision = runGatedStart({
    runReleaseCheck: () => runCommand("npm", ["run", "release:check"]),
    checkSiteOrigin: () =>
      runCommand(process.execPath, [originCheckPath]),
    startServer: launchServer
  });

  if (!decision.started) {
    process.exitCode = decision.exitCode;
    return;
  }

  process.exitCode = await decision.startResult;
}

const invokedPath =
  process.argv[1] === undefined
    ? null
    : pathToFileURL(resolve(process.argv[1])).href;

if (invokedPath === import.meta.url) {
  await main();
}