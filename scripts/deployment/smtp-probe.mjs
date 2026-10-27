import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  CONTACT_MAIL_NOT_CONFIGURED,
  CONTACT_MAIL_TIMEOUT,
  sendContactEmailUsingEnvironment
} from "../../lib/mail-transport.mjs";

export const SMTP_PROBE_USAGE =
  "Usage: node scripts/deployment/smtp-probe.mjs [--dry-run | --send --confirm synthetic-only]";

export async function runSmtpProbe(
  args = [],
  env = process.env,
  sender = sendContactEmailUsingEnvironment
) {
  if (args.length === 1 && args[0] === "--help") {
    return { exitCode: 0, code: "SMTP_PROBE_HELP" };
  }

  const dryRun = args.length === 0
    || (args.length === 1 && args[0] === "--dry-run");
  const confirmedSend = args.length === 3
    && args[0] === "--send"
    && args[1] === "--confirm"
    && args[2] === "synthetic-only";

  if (!dryRun && !confirmedSend) {
    return { exitCode: 2, code: "SMTP_PROBE_ARGUMENTS_INVALID" };
  }

  const probeId = randomUUID();
  if (dryRun) {
    return { exitCode: 0, code: "SMTP_PROBE_DRY_RUN", probeId };
  }

  // No CLI argument, environment string, or user input becomes probe content.
  // Sender and recipient are taken solely from the protected SMTP environment.
  const email = {
    subject: `Shouban synthetic SMTP probe ${probeId}`,
    text: [
      "Synthetic operational SMTP probe. No visitor information is included.",
      `Probe ID: ${probeId}`,
      "Verify receipt in the approved mailbox, then remove the probe and its controlled copies."
    ].join("\n")
  };

  try {
    await sender(email, env);
    return { exitCode: 0, code: "SMTP_PROBE_ACCEPTED", probeId };
  } catch (error) {
    const code = error?.message === CONTACT_MAIL_NOT_CONFIGURED
      ? "SMTP_PROBE_CONFIGURATION_INVALID"
      : error?.message === CONTACT_MAIL_TIMEOUT
        ? "SMTP_PROBE_TIMEOUT"
        : "SMTP_PROBE_DELIVERY_FAILED";
    return { exitCode: 1, code, probeId };
  }
}

async function main() {
  const result = await runSmtpProbe(process.argv.slice(2));
  const output = result.code === "SMTP_PROBE_HELP"
    ? SMTP_PROBE_USAGE
    : `${result.code}${result.probeId ? ` probe_id=${result.probeId}` : ""}`;
  (result.exitCode === 0 ? process.stdout : process.stderr).write(`${output}\n`);
  process.exitCode = result.exitCode;
}

const invokedPath = process.argv[1] === undefined
  ? null
  : pathToFileURL(resolve(process.argv[1])).href;

if (invokedPath === import.meta.url) {
  await main();
}
