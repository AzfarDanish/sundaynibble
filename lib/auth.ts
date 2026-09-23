export const ADMIN_COOKIE_NAME = "sn_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

export function isAdminCookieValid(value: string | undefined): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  return value === password;
}
