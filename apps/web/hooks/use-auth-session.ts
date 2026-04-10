"use client";

import { useCallback, useEffect, useState } from "react";

import { getAuctionBackendHttpUrl } from "@/lib/auction-backend";
import type { AuthUser } from "@auction/shared";
import type { GuestAuthRequest, SessionResponse } from "@auction/shared";

const AUTH_EVENT_NAME = "auction-auth-changed";

export type AuthSessionState = "loading" | "authenticated" | "unauthenticated";

export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT_NAME));
  }
}

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [state, setState] = useState<AuthSessionState>("loading");

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${getAuctionBackendHttpUrl()}/api/auth/session`, {
        credentials: "include",
      });
      const payload = (await response.json()) as SessionResponse;
      setUser(payload.user);
      setState(payload.user ? "authenticated" : "unauthenticated");
    } catch {
      setUser(null);
      setState("unauthenticated");
    }
  }, []);

  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(() => {
      void refreshSession();
    }, 0);

    const handleAuthChanged = () => {
      void refreshSession();
    };

    window.addEventListener(AUTH_EVENT_NAME, handleAuthChanged);

    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.removeEventListener(AUTH_EVENT_NAME, handleAuthChanged);
    };
  }, [refreshSession]);

  const signInGuest = useCallback(async (input: GuestAuthRequest) => {
    const response = await fetch(`${getAuctionBackendHttpUrl()}/api/auth/guest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => null)) as {
      user?: AuthUser;
      message?: string;
    } | null;

    if (!response.ok) {
      throw new Error(payload?.message ?? "Unable to sign in.");
    }

    notifyAuthChanged();
    return payload?.user ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await fetch(`${getAuctionBackendHttpUrl()}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    notifyAuthChanged();
  }, []);

  return {
    user,
    state,
    signInGuest,
    signOut,
    refreshSession,
  };
}
