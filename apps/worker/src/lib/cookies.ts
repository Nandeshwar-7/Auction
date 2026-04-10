export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map(part => {
      const idx = part.indexOf("=");
      if (idx === -1) return [part.trim(), ""];
      return [part.slice(0, idx).trim(), part.slice(idx + 1).trim()];
    }),
  );
}

export function buildSetCookieHeader(
  name: string,
  value: string,
  expiresAt: Date,
): string {
  const expires = expiresAt.toUTCString();
  return `${name}=${value}; Path=/; HttpOnly; SameSite=None; Secure; Expires=${expires}`;
}

export function buildClearCookieHeader(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=None; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
