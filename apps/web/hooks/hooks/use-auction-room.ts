"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAuctionBackendHttpUrl, getAuctionBackendWsUrl } from "@/lib/auction-backend";
import type { RoomAccessRecord, RoomAccessResponse } from "@auction/shared";
import { ROOM_EVENT_TYPES, type ClientToServerEvent, type ServerToClientEvent } from "@auction/shared";
import type { AuctionRoomSnapshot } from "@/types/auction";

export type RoomConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type RoomAccessState =
  | "loading"
  | "authorized"
  | "unauthenticated"
  | "unauthorized";

type UseAuctionRoomResult = {
  snapshot: AuctionRoomSnapshot | null;
  access: RoomAccessRecord | null;
  accessState: RoomAccessState;
  connectionState: RoomConnectionState;
  notice: string | null;
  debugMessage: string | null;
  placeBid: () => void;
  startAuction: () => void;
  markSold: () => void;
  markUnsold: () => void;
  pauseAuction: () => void;
  resumeAuction: () => void;
  closeCurrentLot: () => void;
  retryConnection: () => void;
};

function shouldDisableBidding(snapshot: AuctionRoomSnapshot | null) {
  return !snapshot || snapshot.phase !== "live" || snapshot.isPaused;
}

export function useAuctionRoom(roomId: string): UseAuctionRoomResult {
  const normalizedRoomId = useMemo(() => roomId.trim().toUpperCase(), [roomId]);
  const [snapshot, setSnapshot] = useState<AuctionRoomSnapshot | null>(null);
  const [access, setAccess] = useState<RoomAccessRecord | null>(null);
  const [accessState, setAccessState] = useState<RoomAccessState>("loading");
  const [connectionState, setConnectionState] = useState<RoomConnectionState>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [connectionNonce, setConnectionNonce] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const snapshotTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const closedByEffectRef = useRef(false);
  const snapshotReceivedRef = useRef(false);

  const socketUrl = useMemo(() => getAuctionBackendWsUrl(), []);
  const backendUrl = useMemo(() => getAuctionBackendHttpUrl(), []);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (snapshotTimeoutRef.current) {
      window.clearTimeout(snapshotTimeoutRef.current);
      snapshotTimeoutRef.current = null;
    }
  }, []);

  const isSocketOpen = useCallback(() => {
    return socketRef.current?.readyState === WebSocket.OPEN;
  }, []);

  const sendEvent = useCallback((event: ClientToServerEvent) => {
    if (!isSocketOpen()) {
      setNotice("Realtime connection is not ready yet. Reconnecting to the room...");
      return false;
    }

    socketRef.current?.send(JSON.stringify(event));
    return true;
  }, [isSocketOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      if (!normalizedRoomId) {
        setAccessState("unauthorized");
        return;
      }

      setAccessState("loading");
      setDebugMessage(null);

      try {
        const response = await fetch(`${backendUrl}/api/rooms/${encodeURIComponent(normalizedRoomId)}/access`, {
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as
          | RoomAccessResponse
          | { message?: string }
          | null;

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          setAccess(null);
          setAccessState("unauthenticated");
          setNotice(
            payload && "message" in payload && payload.message
              ? payload.message
              : "Sign in to join this room.",
          );
          return;
        }

        if (response.status === 403 || response.status === 404) {
          setAccess(null);
          setAccessState("unauthorized");
          setNotice(
            payload && "message" in payload && payload.message
              ? payload.message
              : "You do not have access to this room.",
          );
          return;
        }

        if (!response.ok || !payload || !("access" in payload)) {
          throw new Error(
            payload && "message" in payload && payload.message
              ? payload.message
              : "Unable to load room access.",
          );
        }

        setAccess(payload.access);
        setAccessState("authorized");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAccess(null);
        setAccessState("unauthorized");
        setDebugMessage(error instanceof Error ? error.message : "Unable to verify room access.");
      }
    }

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, [backendUrl, connectionNonce, normalizedRoomId]);

  useEffect(() => {
    if (accessState !== "authorized" || !normalizedRoomId) {
      clearTimers();
      socketRef.current?.close();
      socketRef.current = null;
      setConnectionState(accessState === "loading" ? "idle" : "disconnected");
      return;
    }

    closedByEffectRef.current = false;

    const openConnection = (mode: RoomConnectionState) => {
      clearTimers();
      snapshotReceivedRef.current = false;
      setConnectionState(mode);

      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      snapshotTimeoutRef.current = window.setTimeout(() => {
        if (!socketRef.current || socketRef.current !== socket || snapshotReceivedRef.current) {
          return;
        }

        setDebugMessage(
          "No room_snapshot arrived within 3 seconds. Check the websocket URL, backend port, and server logs.",
        );
      }, 3000);

      socket.addEventListener("open", () => {
        if (socketRef.current !== socket) {
          return;
        }

        reconnectAttemptRef.current = 0;
        setConnectionState("connected");
        setNotice(null);

        const joinEvent = {
          type: ROOM_EVENT_TYPES.joinRoom,
          roomId: normalizedRoomId,
        } satisfies ClientToServerEvent;

        socket.send(JSON.stringify(joinEvent));
      });

      socket.addEventListener("message", (messageEvent) => {
        if (socketRef.current !== socket) {
          return;
        }

        try {
          const event = JSON.parse(messageEvent.data) as ServerToClientEvent;

          switch (event.type) {
            case ROOM_EVENT_TYPES.roomSnapshot:
              clearTimers();
              snapshotReceivedRef.current = true;
              setSnapshot(event.snapshot);
              setNotice(null);
              setDebugMessage(null);
              return;
            case ROOM_EVENT_TYPES.bidAccepted:
            case ROOM_EVENT_TYPES.lotStarted:
            case ROOM_EVENT_TYPES.playerSold:
            case ROOM_EVENT_TYPES.playerUnsold:
            case ROOM_EVENT_TYPES.auctionPaused:
            case ROOM_EVENT_TYPES.auctionResumed:
              setNotice(event.notice);
              return;
            case ROOM_EVENT_TYPES.timerUpdated:
              setSnapshot((previous) =>
                previous && previous.roomId === event.roomId
                  ? {
                      ...previous,
                      countdownRemainingSeconds: event.countdownRemainingSeconds,
                    }
                  : previous,
              );
              return;
            case ROOM_EVENT_TYPES.roomError:
              setNotice(event.message);
              setDebugMessage(event.message);

              if (event.code === "UNAUTHENTICATED") {
                setAccess(null);
                setAccessState("unauthenticated");
              }

              if (event.code === "ROOM_ACCESS_DENIED") {
                setAccess(null);
                setAccessState("unauthorized");
              }
              return;
            default:
              return;
          }
        } catch (error) {
          setNotice("A malformed websocket message was received from the room server.");
          setDebugMessage(error instanceof Error ? error.message : "Malformed websocket message.");
        }
      });

      socket.addEventListener("close", () => {
        if (socketRef.current !== socket) {
          return;
        }

        socketRef.current = null;

        if (closedByEffectRef.current) {
          setConnectionState("disconnected");
          return;
        }

        reconnectAttemptRef.current += 1;
        setConnectionState("reconnecting");
        setNotice("Connection lost. Rejoining the auction room...");

        const reconnectDelay = Math.min(1000 * reconnectAttemptRef.current, 4000);
        reconnectTimerRef.current = window.setTimeout(() => {
          openConnection("reconnecting");
        }, reconnectDelay);
      });

      socket.addEventListener("error", () => {
        if (socketRef.current !== socket || closedByEffectRef.current) {
          return;
        }

        setDebugMessage(
          "Unable to reach the realtime auction server. Check that the backend is running and the websocket port is correct.",
        );

        if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      });
    };

    openConnection("connecting");

    return () => {
      closedByEffectRef.current = true;
      clearTimers();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [accessState, clearTimers, normalizedRoomId, socketUrl]);

  const retryConnection = useCallback(() => {
    clearTimers();
    setSnapshot(null);
    snapshotReceivedRef.current = false;
    setNotice("Retrying room access and websocket connection...");
    setDebugMessage(null);
    socketRef.current?.close();
    setConnectionNonce((previous) => previous + 1);
  }, [clearTimers]);

  const sendHostAction = useCallback(
    (type: ClientToServerEvent["type"], pendingNotice: string) => {
      if (!snapshot) {
        setNotice("The room snapshot is still loading. Please wait a moment and try again.");
        return;
      }

      if (!access?.canControlAuction) {
        setNotice("Only the room host can control the auction lifecycle.");
        return;
      }

      if (connectionState !== "connected" || !isSocketOpen()) {
        setNotice("Realtime connection is still syncing. Please wait a moment and try again.");
        return;
      }

      sendEvent({
        type,
        roomId: normalizedRoomId,
      } as ClientToServerEvent);
      setNotice(pendingNotice);
    },
    [access?.canControlAuction, connectionState, isSocketOpen, normalizedRoomId, sendEvent, snapshot],
  );

  const placeBid = useCallback(() => {
    if (!snapshot) {
      setNotice("The room snapshot is still loading. Please wait a moment and try again.");
      return;
    }

    if (!access?.canBid) {
      setNotice("Your role is view-only in this room.");
      return;
    }

    if (connectionState !== "connected" || !isSocketOpen()) {
      setNotice("Realtime connection is still syncing. Please wait before placing a bid.");
      return;
    }

    if (shouldDisableBidding(snapshot)) {
      setNotice(
        snapshot.phase === "paused"
          ? "The lot is paused. Wait for the host to resume the auction before bidding."
          : "Bidding is closed for this lot.",
      );
      return;
    }

    if (!access.assignedTeamId) {
      setNotice("Your franchise assignment is missing for this room. Rejoin the room to claim a team.");
      return;
    }

    sendEvent({
      type: ROOM_EVENT_TYPES.placeBid,
      roomId: normalizedRoomId,
      teamId: access.assignedTeamId,
    });
  }, [access, connectionState, isSocketOpen, normalizedRoomId, sendEvent, snapshot]);

  const startAuction = useCallback(() => {
    if (!snapshot) {
      setNotice("The room snapshot is still loading. Please wait a moment and try again.");
      return;
    }

    if (snapshot.roomStatus !== "draft" && snapshot.phase !== "idle") {
      setNotice("The auction has already started for this room.");
      return;
    }

    sendHostAction(ROOM_EVENT_TYPES.startAuction, "Starting the auction...");
  }, [sendHostAction, snapshot]);

  const markSold = useCallback(() => {
    sendHostAction(ROOM_EVENT_TYPES.markSold, "Closing the lot as SOLD...");
  }, [sendHostAction]);

  const markUnsold = useCallback(() => {
    sendHostAction(ROOM_EVENT_TYPES.markUnsold, "Closing the lot as UNSOLD...");
  }, [sendHostAction]);

  const pauseAuction = useCallback(() => {
    if (snapshot?.phase !== "live") {
      setNotice("Only a live lot can be paused.");
      return;
    }

    sendHostAction(ROOM_EVENT_TYPES.pauseAuction, "Pausing the auction...");
  }, [sendHostAction, snapshot?.phase]);

  const resumeAuction = useCallback(() => {
    if (snapshot?.phase !== "paused") {
      setNotice("The room is not paused right now.");
      return;
    }

    sendHostAction(ROOM_EVENT_TYPES.resumeAuction, "Resuming the auction...");
  }, [sendHostAction, snapshot?.phase]);

  const closeCurrentLot = useCallback(() => {
    if (!snapshot || (snapshot.phase !== "live" && snapshot.phase !== "paused")) {
      setNotice("Only an active lot can be closed.");
      return;
    }

    sendHostAction(ROOM_EVENT_TYPES.closeCurrentLot, "Closing the current lot...");
  }, [sendHostAction, snapshot]);

  return {
    snapshot,
    access,
    accessState,
    connectionState,
    notice: notice ?? snapshot?.notice ?? null,
    debugMessage,
    placeBid,
    startAuction,
    markSold,
    markUnsold,
    pauseAuction,
    resumeAuction,
    closeCurrentLot,
    retryConnection,
  };
}
