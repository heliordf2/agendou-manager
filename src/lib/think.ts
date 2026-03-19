export const THINK_COOKIE_KEY = "think-ok-v2";
export const THINK_TTL_SECONDS = 60 * 15;

export function isThinkCookieValid(cookieValue?: string): boolean {
  const issuedAt = cookieValue ? Number(cookieValue) : Number.NaN;
  if (!Number.isFinite(issuedAt)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return now - issuedAt <= THINK_TTL_SECONDS;
}
