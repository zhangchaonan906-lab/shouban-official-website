export function isPrivateBindIp(value: unknown): boolean;
export function validateTrustedProxyCidrs(value: string): string[];
export type DeploymentCheckIo = {
  lstat: (path: string) => { isSymbolicLink(): boolean; isFile(): boolean; isDirectory(): boolean; mode: number; uid: number; nlink: number; size: number };
  read: (path: string, encoding?: string) => string | Buffer;
  realpath: (path: string) => string;
};
export type DeploymentCheckRunner = (program: string, args: string[], options: Record<string, unknown>) => {
  status: number | null;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  error?: unknown;
};
export function validateDeploymentModel(model: unknown, config: unknown): void;
export function runDeploymentChecks(options: {
  mode: string;
  modelOnly?: boolean;
  env?: Record<string, string | undefined>;
  run?: DeploymentCheckRunner;
  io?: DeploymentCheckIo;
  platform?: string;
}): string;
