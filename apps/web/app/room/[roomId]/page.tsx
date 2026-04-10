"use client";

import { useParams } from "next/navigation";

import { AuctionRoomShell } from "@/components/auction/auction-room-shell";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  return <AuctionRoomShell roomId={roomId ?? ""} />;
}
