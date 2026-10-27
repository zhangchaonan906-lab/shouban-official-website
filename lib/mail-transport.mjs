import nodemailer from "nodemailer";
import { Socket } from "node:net";

export const CONTACT_MAIL_NOT_CONFIGURED = "CONTACT_MAIL_NOT_CONFIGURED";
export const CONTACT_MAIL_DELIVERY_FAILED = "CONTACT_MAIL_DELIVERY_FAILED";
export const CONTACT_MAIL_TIMEOUT = "CONTACT_MAIL_TIMEOUT";
export const CONTACT_MAIL_TIMEOUT_MS = 15_000;

function readRequiredEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(CONTACT_MAIL_NOT_CONFIGURED);
  }
  return value;
}

// The server-only TypeScript wrapper and the isolated operational probe share
// this one SMTP implementation. Never log transport options or SMTP errors.
export async function sendContactEmailUsingEnvironment(email, env = process.env) {
  const host = readRequiredEnv(env, "SMTP_HOST");
  const portValue = readRequiredEnv(env, "SMTP_PORT");
  const user = readRequiredEnv(env, "SMTP_USER");
  const pass = readRequiredEnv(env, "SMTP_PASS");
  const from = readRequiredEnv(env, "SMTP_FROM");
  const to = readRequiredEnv(env, "CONTACT_TO_EMAIL");

  if (portValue !== "465" && portValue !== "587") {
    throw new Error(CONTACT_MAIL_NOT_CONFIGURED);
  }

  let transporter;
  let timeout;
  const socket = new Socket();
  try {
    const port = Number(portValue);
    transporter = nodemailer.createTransport({
      host,
      port,
      // Nodemailer owns connecting and TLS upgrades. Owning the underlying
      // socket lets the total deadline terminate an in-flight SMTP exchange.
      socket,
      secure: port === 465,
      ...(port === 587 ? { requireTLS: true } : {}),
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2" },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true
    });

    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(CONTACT_MAIL_TIMEOUT));
        socket.destroy();
      }, CONTACT_MAIL_TIMEOUT_MS);
    });

    const result = await Promise.race([
      transporter.sendMail({
        from,
        to,
        subject: email.subject,
        text: email.text
      }),
      deadline
    ]);

    // SMTP acceptance is not proof of inbox delivery. Reject partial delivery
    // as well, so an operational probe cannot report it as fully accepted.
    if (
      !result
      || !Array.isArray(result.accepted)
      || result.accepted.length === 0
      || (Array.isArray(result.rejected) && result.rejected.length > 0)
    ) {
      throw new Error(CONTACT_MAIL_DELIVERY_FAILED);
    }
  } catch (error) {
    throw new Error(
      error?.message === CONTACT_MAIL_TIMEOUT || error?.code === "ETIMEDOUT"
        ? CONTACT_MAIL_TIMEOUT
        : CONTACT_MAIL_DELIVERY_FAILED
    );
  } finally {
    clearTimeout(timeout);
    socket.destroy();
    try {
      transporter?.close?.();
    } catch {
      // Closing must not reveal raw transport errors or replace the outcome.
    }
  }
}
