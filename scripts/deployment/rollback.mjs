#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { executeRollback, loadRollbackPlan } from "./rollback-plan.mjs";

export function runRollbackCli(args, { load = loadRollbackPlan, execute = executeRollback, write = (text) => process.stdout.write(text) } = {}) {
  if (Number(process.versions.node.split(".")[0]) !== 24) { write("ROLLBACK_NODE_24_REQUIRED\n"); return 1; }
  const valid = args.length === 2 || (args.length === 3 && args[2] === "--apply");
  if (!valid || args[0] !== "--descriptor" || typeof args[1] !== "string" || args[1].startsWith("--")) {
    write("ROLLBACK_USAGE: node scripts/deployment/rollback.mjs --descriptor /opt/shouban/releases/<releaseId>/release.json [--apply]\n");
    return 2;
  }
  const plan = load(args[1]);
  if (!plan.ok) { write(plan.code + "\n"); return 1; }
  const result = execute(plan, { apply: args[2] === "--apply", run: spawnSync });
  write(result.code + "\n");
  if (result.ok) write(`mode=${result.mode} services=${result.services.join(",")}\n`);
  return result.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = runRollbackCli(process.argv.slice(2)); }
  catch { process.stdout.write("ROLLBACK_INTERNAL_ERROR\n"); process.exitCode = 1; }
}
