import "server-only";

import type { ContactEmail } from "./contact-email";
import { sendContactEmailUsingEnvironment } from "./mail-transport.mjs";

export { CONTACT_MAIL_NOT_CONFIGURED } from "./mail-transport.mjs";

export async function sendContactEmail(email: ContactEmail) {
  await sendContactEmailUsingEnvironment(email);
}
