function getBackendPort() {
  return (
    process.env.NEXT_PUBLIC_AUCTION_API_PORT ??
    process.env.NEXT_PUBLIC_AUCTION_WS_PORT ??
    "4000"
  );
}

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getAuctionBackendHttpUrl() {
  if (typeof window === "undefined") {
    return normalizeUrl(
      process.env.NEXT_PUBLIC_AUCTION_API_URL ?? `http://localhost:${getBackendPort()}`,
    );
  }

  if (process.env.NEXT_PUBLIC_AUCTION_API_URL) {
    return normalizeUrl(process.env.NEXT_PUBLIC_AUCTION_API_URL);
  }

  return normalizeUrl(
    `${window.location.protocol}//${window.location.hostname}:${getBackendPort()}`,
  );
}

function getAuctionBackendHttpCandidates() {
  if (typeof window === "undefined") {
    return [getAuctionBackendHttpUrl()];
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const backendPort = getBackendPort();

  return Array.from(
    new Set(
      [
        process.env.NEXT_PUBLIC_AUCTION_API_URL
          ? normalizeUrl(process.env.NEXT_PUBLIC_AUCTION_API_URL)
          : null,
        normalizeUrl(`${protocol}//${hostname}:${backendPort}`),
        !isLocalHostname(hostname) ? normalizeUrl(`${protocol}//localhost:${backendPort}`) : null,
        !isLocalHostname(hostname) ? normalizeUrl(`${protocol}//127.0.0.1:${backendPort}`) : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

export async function fetchAuctionBackend(
  path: string,
  init?: RequestInit,
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = getAuctionBackendHttpCandidates();
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${normalizedPath}`, init);

      if (response.status === 404) {
        lastResponse = response;
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError ?? new Error("Unable to reach the auction backend.");
}

export function getAuctionBackendWsUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_AUCTION_WS_URL ?? `ws://localhost:${getBackendPort()}`;
  }

  if (process.env.NEXT_PUBLIC_AUCTION_WS_URL) {
    return process.env.NEXT_PUBLIC_AUCTION_WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";

  return `${protocol}://${window.location.hostname}:${getBackendPort()}`;
}
