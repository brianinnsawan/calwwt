// Admin changes (audit N04; Brian, 2 Nov 2026). Changing page access or people, managing logins, backups and
// "View the site as" need:
//   1. 2-step sign-in: this sign-in used a 6-digit authenticator code (when TWO_STEP_FOR_ADMINS is "true"), and
//   2. a fresh confirmation: signed in, or password re-entered, within the last 15 minutes.
// The Admin page reads the error prefixes: CONFIRM_PASSWORD opens a password (+ code) box and retries;
// TWO_STEP_REQUIRED points to the Account page.
import { HttpError } from './auth.mjs';

export const CONFIRM_SECONDS = 15 * 60;
export function requireAdminGate(env, actor, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (env.TWO_STEP_FOR_ADMINS === 'true' && !actor?.sessionTwoStep)
    throw new HttpError(403, 'TWO_STEP_REQUIRED: Admin changes need 2-step sign-in. Set it up on your Account page, then try again.');
  const fresh = Math.max(actor?.sessionCreatedAt || 0, actor?.sessionConfirmedAt || 0);
  if (!fresh || nowSeconds - fresh > CONFIRM_SECONDS)
    throw new HttpError(403, 'CONFIRM_PASSWORD: For safety, confirm your password before making admin changes.');
}
