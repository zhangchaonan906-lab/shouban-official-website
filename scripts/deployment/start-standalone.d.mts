export function runGatedStart<T>(options: {
  runReleaseCheck: () => number;
  checkSiteOrigin: () => number;
  startServer: () => T;
}):
  | { started: false; exitCode: number }
  | { started: true; exitCode: 0; startResult: T };
