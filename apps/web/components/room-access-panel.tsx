"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  Globe2,
  LockKeyhole,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Users2,
} from "lucide-react";

import { GuestLoginCard } from "@/components/auth/guest-login-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchAuctionBackend } from "@/lib/auction-backend";
import { cn } from "@/lib/utils";
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomResponse,
  TeamsResponse,
} from "@auction/shared";
import type { RoomPrivacyMode, RoomParticipantRole } from "@auction/shared";
import type { AuctionTeam } from "@auction/shared";

type RoomAccessPanelProps = {
  mode: "create" | "join";
  checklist: string[];
  initialRoomCode?: string;
};

type ChoiceCardProps = {
  label: string;
  description: string;
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
};

function buildRoomCode() {
  return `room-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function ChoiceCard({
  label,
  description,
  active,
  icon: Icon,
  onClick,
  disabled,
  badge,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-200",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]",
        "hover:-translate-y-0.5 hover:border-white/18 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))]",
        active
          ? "border-[color:var(--accent)]/40 bg-[linear-gradient(145deg,rgba(215,180,106,0.16),rgba(255,255,255,0.06))] shadow-[0_18px_42px_rgba(0,0,0,0.24)]"
          : "border-white/10",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-full border border-white/10 bg-black/20 p-2.5">
          <Icon className={cn("h-4 w-4 text-white/72", active && "text-[color:var(--accent)]")} />
        </div>
        {badge ? (
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/62">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-5 font-display text-2xl uppercase text-white">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/66">{description}</p>
    </button>
  );
}

export function RoomAccessPanel({ mode, checklist, initialRoomCode }: RoomAccessPanelProps) {
  const router = useRouter();
  const { user, state } = useAuthSession();
  const initialCode = useMemo(() => buildRoomCode(), []);
  const [roomCode, setRoomCode] = useState(mode === "create" ? initialCode : initialRoomCode ?? "");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<RoomPrivacyMode>("private");
  const [joinRole, setJoinRole] = useState<Exclude<RoomParticipantRole, "host">>("participant");
  const [teams, setTeams] = useState<AuctionTeam[]>([]);
  const [claimedTeamIds, setClaimedTeamIds] = useState<string[]>([]);
  const [teamLookupState, setTeamLookupState] = useState<"idle" | "loading" | "ready" | "missing">(
    "idle",
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const trimmedCode = roomCode.trim().replace(/\s+/g, "-").toLowerCase();
  const canContinue =
    trimmedCode.length > 0 && (mode === "create" || joinRole === "viewer" || Boolean(selectedTeamId));

  useEffect(() => {
    if (mode !== "join") {
      return;
    }

    let cancelled = false;

    async function loadTeams() {
      try {
        const response = await fetchAuctionBackend("/api/teams", {
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as TeamsResponse | null;

        if (!response.ok || !payload?.teams || cancelled) {
          return;
        }

        setTeams(payload.teams);
      } catch {
        if (!cancelled) {
          setTeams([]);
        }
      }
    }

    void loadTeams();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "join") {
      return;
    }

    if (!trimmedCode) {
      setClaimedTeamIds([]);
      setTeamLookupState("idle");
      return;
    }

    const controller = new AbortController();
    setTeamLookupState("loading");

    async function loadRoomPreview() {
      try {
        const response = await fetchAuctionBackend(`/api/rooms/${encodeURIComponent(trimmedCode)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as RoomResponse | { message?: string } | null;

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok || !payload || !("claimedTeamIds" in payload)) {
          setClaimedTeamIds([]);
          setTeamLookupState("missing");
          return;
        }

        setClaimedTeamIds(payload.claimedTeamIds);
        setTeamLookupState("ready");
      } catch {
        if (!controller.signal.aborted) {
          setClaimedTeamIds([]);
          setTeamLookupState("missing");
        }
      }
    }

    void loadRoomPreview();

    return () => {
      controller.abort();
    };
  }, [mode, trimmedCode]);

  useEffect(() => {
    if (joinRole === "viewer") {
      setSelectedTeamId("");
      return;
    }

    if (selectedTeamId && !claimedTeamIds.includes(selectedTeamId)) {
      return;
    }

    const firstAvailableTeam = teams.find((team) => !claimedTeamIds.includes(team.id));
    setSelectedTeamId(firstAvailableTeam?.id ?? "");
  }, [claimedTeamIds, joinRole, selectedTeamId, teams]);

  const handleContinue = async () => {
    if (!canContinue) {
      return;
    }

    setPending(true);
    setErrorMessage(null);

    try {
      if (mode === "create") {
        const response = await fetchAuctionBackend("/api/rooms", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: trimmedCode,
            name: `Auction Room ${trimmedCode.toUpperCase()}`,
            privacy,
          } satisfies CreateRoomRequest),
        });

        const payload = (await response.json().catch(() => null)) as
          | CreateRoomResponse
          | { message?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload && "message" in payload
              ? payload.message ?? "Unable to create room."
              : "Unable to create room.",
          );
        }

        router.push(`/room/${encodeURIComponent((payload as CreateRoomResponse).room.code)}`);
        router.refresh();
        return;
      }

      const response = await fetchAuctionBackend("/api/rooms/join", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: trimmedCode,
          role: joinRole,
          teamId: joinRole === "participant" ? selectedTeamId : null,
        } satisfies JoinRoomRequest),
      });

      const payload = (await response.json().catch(() => null)) as
        | JoinRoomResponse
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "message" in payload
            ? payload.message ?? "Unable to join that room."
            : "Unable to join that room.",
        );
      }

      router.push(`/room/${encodeURIComponent((payload as JoinRoomResponse).access.room.code)}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Room action failed.");
    } finally {
      setPending(false);
    }
  };

  const handleGenerate = () => {
    setRoomCode(buildRoomCode());
  };

  if (state === "loading") {
    return (
      <Card className="bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))]">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm text-white/70">Loading your session...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <GuestLoginCard
        nextHref={mode === "create" ? "/create-room" : "/join-room"}
        title={mode === "create" ? "Sign in to host a room" : "Sign in to join a room"}
        description={
          mode === "create"
            ? "Hosts need a real session so the backend can persist room ownership and enforce commissioner controls."
            : "Every bidder, viewer, and host now joins with a persistent identity so room access and permissions survive refreshes."
        }
      />
    );
  }

  return (
    <Card className="bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))]">
      <CardContent className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--accent)]">
          Room access
        </p>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/82">
          Signed in as <span className="font-semibold text-white">{user.name}</span>
        </div>

        <div className="mt-6 space-y-4">
          {checklist.map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/6 px-4 py-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--accent)]/14 font-display text-lg text-[color:var(--accent)]">
                {index + 1}
              </div>
              <p className="text-sm text-white/82">{item}</p>
            </div>
          ))}
        </div>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            void handleContinue();
          }}
        >
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <label
              htmlFor={`${mode}-room-code`}
              className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/58"
            >
              {mode === "create" ? "Room code" : "Enter room code"}
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                id={`${mode}-room-code`}
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder={mode === "create" ? "room-ABC123" : "Paste your room code"}
                className={cn(
                  "h-[3.25rem] w-full rounded-full border border-white/10 bg-black/20 px-5 text-base text-white outline-none transition-colors",
                  "placeholder:text-white/32 focus:border-[color:var(--accent)]/40",
                )}
              />

              {mode === "create" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={pending}
                >
                  Regenerate
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {mode === "create" ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/58">
                    Room privacy
                  </label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ChoiceCard
                      label="Private"
                      description="Invite-only war room with controlled entry and locked memberships."
                      active={privacy === "private"}
                      icon={LockKeyhole}
                      onClick={() => setPrivacy("private")}
                      disabled={pending}
                    />
                    <ChoiceCard
                      label="Public"
                      description="Anyone with the room code can watch, but bidder identity still stays persistent."
                      active={privacy === "public"}
                      icon={Globe2}
                      onClick={() => setPrivacy("public")}
                      disabled={pending}
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-[color:var(--muted-foreground)]">
                  Private rooms keep the table tight and intentional. Public rooms are better for demos and spectators, but bidder identity and roles are still enforced from the backend.
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/58">
                      Join as
                    </label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <ChoiceCard
                        label="Participant"
                        description="Claim one franchise for the whole room and bid with that team only."
                        active={joinRole === "participant"}
                        icon={Users2}
                        badge="Locked team"
                        onClick={() => setJoinRole("participant")}
                        disabled={pending}
                      />
                      <ChoiceCard
                        label="Viewer"
                        description="Watch the auction feed without taking a franchise or placing bids."
                        active={joinRole === "viewer"}
                        icon={Eye}
                        onClick={() => setJoinRole("viewer")}
                        disabled={pending}
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-[color:var(--muted-foreground)]">
                    {joinRole === "participant"
                      ? "Participants must reserve exactly one franchise before entering. That franchise stays locked to the user for the room."
                      : "Viewers can reconnect safely without controlling the auction or claiming a team."}
                  </div>
                </div>

                {joinRole === "participant" ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/58">
                        Choose your franchise
                      </label>
                      <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        {teamLookupState === "loading"
                          ? "Checking room"
                          : `${Math.max(teams.length - claimedTeamIds.length, 0)} open`}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {teams.map((team) => {
                        const isClaimed = claimedTeamIds.includes(team.id);
                        const isSelected = selectedTeamId === team.id;

                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => setSelectedTeamId(team.id)}
                            disabled={pending || isClaimed}
                            className={cn(
                              "rounded-[24px] border p-4 text-left transition-all duration-200",
                              "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]",
                              "hover:-translate-y-0.5 hover:border-white/18",
                              isSelected
                                ? "border-[color:var(--accent)]/40 bg-[linear-gradient(145deg,rgba(215,180,106,0.16),rgba(255,255,255,0.06))]"
                                : "border-white/10",
                              isClaimed && "cursor-not-allowed opacity-45",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-11 w-11 rounded-full border border-white/10"
                                  style={{
                                    background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})`,
                                  }}
                                />
                                <div>
                                  <p className="font-display text-3xl uppercase leading-none text-white">
                                    {team.shortCode}
                                  </p>
                                  <p className="mt-1 text-sm text-white/70">{team.name}</p>
                                </div>
                              </div>

                              <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/62">
                                {isClaimed ? "Taken" : isSelected ? "Selected" : "Open"}
                              </div>
                            </div>

                            <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">
                              {isClaimed
                                ? "This franchise has already been reserved in the room."
                                : "Once you enter, this franchise stays locked to your identity for the room."}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {teamLookupState === "missing" ? (
                      <div className="mt-4 rounded-[22px] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm text-amber-100">
                        Room preview is not available yet. You can still try joining if the host has already shared a valid room code.
                      </div>
                    ) : null}

                    {!teams.length && teamLookupState !== "loading" ? (
                      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-white/70">
                        Team slots are loading from the backend. Give it a moment and try again.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              disabled={!canContinue || pending}
              className="justify-center"
            >
              {pending
                ? mode === "create"
                  ? "Creating room..."
                  : "Joining room..."
                : mode === "create"
                  ? "Create and enter room"
                  : joinRole === "participant"
                    ? "Claim team and enter room"
                    : "Join room"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={pending}
              onClick={() => router.push(mode === "create" ? "/join-room" : "/create-room")}
            >
              {mode === "create" ? "Go to join flow" : "Go to create flow"}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.26em] text-white/46">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--accent)]" />
              Persistent identity
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
              <RadioTower className="h-3.5 w-3.5 text-[color:var(--accent)]" />
              Realtime room sync
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
