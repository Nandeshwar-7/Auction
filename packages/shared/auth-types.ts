export type RoomPrivacyMode = "private" | "public";
export type RoomParticipantRole = "host" | "participant" | "viewer";

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export function canBidForRole(role: RoomParticipantRole | null | undefined) {
  return role === "participant";
}

export function canControlAuctionForRole(role: RoomParticipantRole | null | undefined) {
  return role === "host";
}
