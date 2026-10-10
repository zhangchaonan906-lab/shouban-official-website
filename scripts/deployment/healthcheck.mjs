import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export async function isHealthy(fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl("http://127.0.0.1:3000/", {
      signal: AbortSignal.timeout(3000),
      redirect: "follow"
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

const invokedPath =
  process.argv[1] === undefined
    ? null
    : pathToFileURL(resolve(process.argv[1])).href;

if (invokedPath === import.meta.url) {
  process.exitCode = (await isHealthy()) ? 0 : 1;
}