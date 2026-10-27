import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runSmtpProbe } from "../scripts/deployment/smtp-probe.mjs";
import {
  CONTACT_MAIL_NOT_CONFIGURED,
  CONTACT_MAIL_TIMEOUT
} from "../lib/mail-transport.mjs";

const { createTransport, sendMail, close } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  close: vi.fn()
}));

vi.mock("nodemailer", () => ({ default: { createTransport } }));

const probeScript = fileURLToPath(new URL("../scripts/deployment/smtp-probe.mjs", import.meta.url));
const probeIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

describe("isolated synthetic SMTP probe", () => {
  it.each([{ args: [] }, { args: ["--dry-run"] }])("defaults to no delivery and does not read environment values", async ({ args }) => {
    const env = new Proxy({}, { get() { throw new Error("environment must not be read"); } });
    const sender = vi.fn();

    const result = await runSmtpProbe(args, env, sender);

    expect(result).toMatchObject({ exitCode: 0, code: "SMTP_PROBE_DRY_RUN" });
    expect(result.probeId).toMatch(probeIdPattern);
    expect(sender).not.toHaveBeenCalled();
  });

  it.each([
    ["--send"],
    ["--send", "--confirm", "anything-else"],
    ["--confirm", "synthetic-only"],
    ["--send", "--confirm", "synthetic-only", "--to", "recipient@example.test"],
    ["--send", "--confirm", "synthetic-only", "--body", "visitor content"],
    ["--send", "--dry-run"],
    ["--dry-run", "--send", "--confirm", "synthetic-only"]
  ])("rejects unconfirmed, conflicting, or user-content arguments: %j", async (...args) => {
    const sender = vi.fn();

    const result = await runSmtpProbe(args, {}, sender);

    expect(result).toEqual({ exitCode: 2, code: "SMTP_PROBE_ARGUMENTS_INVALID" });
    expect(sender).not.toHaveBeenCalled();
  });

  it("uses the shared adapter with only generated synthetic content and the supplied protected environment", async () => {
    const env = { SMTP_PASS: "test-secret", CONTACT_TO_EMAIL: "recipient@example.test" };
    const sender = vi.fn().mockResolvedValue(undefined);

    const result = await runSmtpProbe(["--send", "--confirm", "synthetic-only"], env, sender);

    expect(result).toMatchObject({ exitCode: 0, code: "SMTP_PROBE_ACCEPTED" });
    expect(result.probeId).toMatch(probeIdPattern);
    expect(sender).toHaveBeenCalledTimes(1);
    const [email, passedEnv] = sender.mock.calls[0];
    expect(passedEnv).toBe(env);
    expect(email).toEqual({
      subject: `Shouban synthetic SMTP probe ${result.probeId}`,
      text: [
        "Synthetic operational SMTP probe. No visitor information is included.",
        `Probe ID: ${result.probeId}`,
        "Verify receipt in the approved mailbox, then remove the probe and its controlled copies."
      ].join("\n")
    });
    expect(JSON.stringify(email)).not.toContain(env.SMTP_PASS);
    expect(JSON.stringify(email)).not.toContain(env.CONTACT_TO_EMAIL);
    expect(JSON.stringify(result)).not.toContain(env.SMTP_PASS);
    expect(JSON.stringify(result)).not.toContain(env.CONTACT_TO_EMAIL);
  });

  it("reaches the same real transport implementation as the website using mocked SMTP", async () => {
    const env = {
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "587",
      SMTP_USER: "synthetic-user",
      SMTP_PASS: "synthetic-secret",
      SMTP_FROM: "probe@example.test",
      CONTACT_TO_EMAIL: "recipient@example.test"
    };
    createTransport.mockReset();
    sendMail.mockReset();
    close.mockReset();
    createTransport.mockReturnValue({ sendMail, close });
    sendMail.mockResolvedValue({ accepted: [env.CONTACT_TO_EMAIL], rejected: [] });

    const result = await runSmtpProbe(["--send", "--confirm", "synthetic-only"], env);

    expect(result).toMatchObject({ exitCode: 0, code: "SMTP_PROBE_ACCEPTED" });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: env.SMTP_HOST,
      port: 587,
      secure: false,
      requireTLS: true,
      logger: false,
      debug: false
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: env.SMTP_FROM,
      to: env.CONTACT_TO_EMAIL,
      subject: expect.stringContaining(result.probeId!)
    }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    [CONTACT_MAIL_NOT_CONFIGURED, "SMTP_PROBE_CONFIGURATION_INVALID"],
    [CONTACT_MAIL_TIMEOUT, "SMTP_PROBE_TIMEOUT"],
    ["private SMTP response with test-secret", "SMTP_PROBE_DELIVERY_FAILED"]
  ])("reports only a safe failure code", async (message, code) => {
    const result = await runSmtpProbe(
      ["--send", "--confirm", "synthetic-only"],
      {},
      vi.fn().mockRejectedValue(new Error(message))
    );

    expect(result).toMatchObject({ exitCode: 1, code });
    expect(JSON.stringify(result)).not.toContain("private SMTP");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it("runs the real CLI dry-run in a subprocess without starting HTTP or requiring SMTP configuration", () => {
    const result = spawnSync(process.execPath, [probeScript], {
      encoding: "utf8",
      env: { NODE_ENV: "test" },
      timeout: 5_000
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/^SMTP_PROBE_DRY_RUN probe_id=[a-f0-9-]+\r?\n$/);
  });

  it("rejects the real CLI send command without confirmation before accessing SMTP", () => {
    const result = spawnSync(process.execPath, [probeScript, "--send"], {
      encoding: "utf8",
      env: { NODE_ENV: "test" },
      timeout: 5_000
    });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("SMTP_PROBE_ARGUMENTS_INVALID\n");
  });
});
