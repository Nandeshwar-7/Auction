import { getAuctionApiBaseUrl, getAuctionWsBaseUrl } from "@/lib/frontend-runtime-config";

export function getAuctionBackendHttpUrl() {
  return getAuctionApiBaseUrl();
}

export async function fetchAuctionBackend(
  path: string,
  init?: RequestInit,
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${getAuctionBackendHttpUrl()}${normalizedPath}`, init);
}

export function getAuctionBackendWsUrl() {
  return getAuctionWsBaseUrl();
}

export function getAuctionRoomWsUrl(roomId: string): string {
  const base = getAuctionBackendWsUrl();
  return `${base}/api/rooms/${encodeURIComponent(roomId)}/ws`;
}
