export const CONTACT_MAIL_NOT_CONFIGURED: "CONTACT_MAIL_NOT_CONFIGURED";
export const CONTACT_MAIL_DELIVERY_FAILED: "CONTACT_MAIL_DELIVERY_FAILED";
export const CONTACT_MAIL_TIMEOUT: "CONTACT_MAIL_TIMEOUT";
export const CONTACT_MAIL_TIMEOUT_MS: number;

export function sendContactEmailUsingEnvironment(
  email: { subject: string; text: string },
  env?: Record<string, string | undefined>
): Promise<void>;
