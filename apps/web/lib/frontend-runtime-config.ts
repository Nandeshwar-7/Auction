function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getBackendPort() {
  return (
    process.env.NEXT_PUBLIC_AUCTION_API_PORT ??
    process.env.NEXT_PUBLIC_AUCTION_WS_PORT ??
    "4000"
  );
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getRequiredPublicEnv(name: "NEXT_PUBLIC_AUCTION_API_URL" | "NEXT_PUBLIC_AUCTION_WS_URL") {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (isProduction()) {
    throw new Error(
      `Missing required public environment variable "${name}" in production. ` +
        "Set it in Cloudflare Worker vars/secrets before deploying.",
    );
  }

  return null;
}

export function getAuctionApiBaseUrl() {
  const configured = getRequiredPublicEnv("NEXT_PUBLIC_AUCTION_API_URL");
  if (configured) {
    return normalizeUrl(configured);
  }

  const backendPort = getBackendPort();
  if (typeof window === "undefined") {
    return `http://localhost:${backendPort}`;
  }

  return normalizeUrl(`${window.location.protocol}//${window.location.hostname}:${backendPort}`);
}

export function getAuctionWsBaseUrl() {
  const configured = getRequiredPublicEnv("NEXT_PUBLIC_AUCTION_WS_URL");
  if (configured) {
    return normalizeUrl(configured);
  }

  const backendPort = getBackendPort();
  if (typeof window === "undefined") {
    return `ws://localhost:${backendPort}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:${backendPort}`;
}

export function getFrontendAuthPath(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  return `/api/auth/${normalizedPath}`;
}
