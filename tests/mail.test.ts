import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_MAIL_NOT_CONFIGURED,
  sendContactEmail
} from "../lib/mail";

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn()
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport
  }
}));

const smtpEnv = {
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "465",
  SMTP_USER: "smtp-user",
  SMTP_PASS: "smtp-password",
  SMTP_FROM: "website@example.test",
  CONTACT_TO_EMAIL: "contact@example.test"
} as const;

const contactEmail = {
  subject: "New contact request",
  text: "A visitor submitted the contact form."
};

function stubSmtpEnv() {
  for (const [name, value] of Object.entries(smtpEnv)) {
    vi.stubEnv(name, value);
  }
}

beforeEach(() => {
  createTransport.mockReset();
  sendMail.mockReset();
  sendMail.mockResolvedValue(undefined);
  createTransport.mockReturnValue({ sendMail });
  stubSmtpEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendContactEmail", () => {
  it("uses implicit TLS for SMTP port 465 and sends the supplied email", async () => {
    await sendContactEmail(contactEmail);

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: smtpEnv.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: smtpEnv.SMTP_USER,
        pass: smtpEnv.SMTP_PASS
      }
    }));
    expect(createTransport.mock.calls[0][0]).not.toHaveProperty("requireTLS");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: smtpEnv.SMTP_FROM,
      to: smtpEnv.CONTACT_TO_EMAIL,
      subject: contactEmail.subject,
      text: contactEmail.text
    });
  });

  it("requires STARTTLS for SMTP port 587 and sends the supplied email", async () => {
    vi.stubEnv("SMTP_PORT", "587");

    await sendContactEmail(contactEmail);

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: smtpEnv.SMTP_HOST,
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: smtpEnv.SMTP_USER,
        pass: smtpEnv.SMTP_PASS
      }
    }));
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: smtpEnv.SMTP_FROM,
      to: smtpEnv.CONTACT_TO_EMAIL,
      subject: contactEmail.subject,
      text: contactEmail.text
    });
  });

  it("trims an allowed SMTP port before validating it", async () => {
    vi.stubEnv("SMTP_PORT", " 587 ");

    await sendContactEmail(contactEmail);

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      port: 587,
      secure: false,
      requireTLS: true
    }));
  });

  it.each(["25", "0", "2525", "587junk", "587.0", "not-a-number"])(
    "rejects unsupported SMTP port %j before creating a transporter",
    async (port) => {
      vi.stubEnv("SMTP_PORT", port);

      await expect(sendContactEmail(contactEmail)).rejects.toThrow(
        CONTACT_MAIL_NOT_CONFIGURED
      );
      expect(createTransport).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    }
  );

  it.each(Object.keys(smtpEnv) as Array<keyof typeof smtpEnv>)(
    "rejects a missing %s before creating a transporter",
    async (name) => {
      vi.stubEnv(name, "");

      await expect(sendContactEmail(contactEmail)).rejects.toThrow(
        CONTACT_MAIL_NOT_CONFIGURED
      );
      expect(createTransport).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    }
  );
});
