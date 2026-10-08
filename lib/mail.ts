import "server-only";

import nodemailer from "nodemailer";
import type { ContactEmail } from "./contact-email";

export const CONTACT_MAIL_NOT_CONFIGURED = "CONTACT_MAIL_NOT_CONFIGURED";

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(CONTACT_MAIL_NOT_CONFIGURED);
  }

  return value;
}

export async function sendContactEmail(email: ContactEmail) {
  const host = readRequiredEnv("SMTP_HOST");
  const portValue = readRequiredEnv("SMTP_PORT");
  const user = readRequiredEnv("SMTP_USER");
  const pass = readRequiredEnv("SMTP_PASS");
  const from = readRequiredEnv("SMTP_FROM");
  const to = readRequiredEnv("CONTACT_TO_EMAIL");

  if (portValue !== "465" && portValue !== "587") {
    throw new Error(CONTACT_MAIL_NOT_CONFIGURED);
  }

  const port = Number(portValue);
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(port === 587 ? { requireTLS: true } : {}),
    auth: {
      user,
      pass
    }
  });

  await transporter.sendMail({
    from,
    to,
    subject: email.subject,
    text: email.text
  });
}
