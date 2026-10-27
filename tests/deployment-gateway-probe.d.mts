export function requestGateway(path: string, options?: {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string | Uint8Array;
}, connection?: {
  target?: string;
  port?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
}): Promise<Response>;
