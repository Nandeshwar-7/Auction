import {
  Activity,
  Radio,
  Users,
} from "lucide-react";

import type { Feature, NavItem, QuickStat } from "@/types/site";

export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/create-room", label: "Create Room" },
  { href: "/join-room", label: "Join Room" },
];

export const heroStats: QuickStat[] = [
  { label: "Room privacy", value: "Private", hint: "Invite-led multiplayer access" },
  { label: "Bid sync", value: "Live", hint: "Realtime room snapshots" },
  { label: "Auction flow", value: "Host", hint: "Controlled lot lifecycle" },
];

export const platformFeatures: Feature[] = [
  {
    title: "Private room control",
    description:
      "Create invite-led auction rooms with stable roles, locked franchises, and a clean host-managed flow.",
    eyebrow: "Access",
    icon: "trophy",
  },
  {
    title: "Live bidding board",
    description:
      "Current player, bid, timer, and purse movement stay readable at a glance during active rounds.",
    eyebrow: "Realtime",
    icon: "dashboard",
  },
  {
    title: "Multiplayer seat map",
    description:
      "Hosts, participants, and viewers enter the same room state and stay synchronized across refreshes and reconnects.",
    eyebrow: "Presence",
    icon: "radio",
  },
  {
    title: "Auction lifecycle",
    description:
      "Pause, settle, and recover rooms with a backend-driven auction engine instead of local-only browser state.",
    eyebrow: "Control",
    icon: "gavel",
  },
  {
    title: "Typed room system",
    description:
      "Clean shared contracts keep auth, room access, realtime events, and persistence easier to extend safely.",
    eyebrow: "System",
    icon: "shield",
  },
  {
    title: "Fast, restrained motion",
    description:
      "Motion is used to clarify live changes, not to decorate the screen during high-pressure bidding moments.",
    eyebrow: "Polish",
    icon: "sparkles",
  },
];

export const createRoomChecklist = [
  "Choose auction format and roster slots",
  "Invite owners with a room code",
  "Configure timer rules and nomination order",
];

export const joinRoomChecklist = [
  "Enter your secure room code",
  "Claim a franchise identity",
  "Wait for the commissioner to go live",
];

export const roomHighlights = [
  {
    title: "Auction Pulse",
    value: "Live Room",
    description: "Realtime auction state, room membership, and purse movement in one focused workspace.",
  },
  {
    title: "Host Control",
    value: "Private",
    description: "Hosts control the room lifecycle while participants only see the actions their role allows.",
  },
  {
    title: "Player Feed",
    value: "Randomized",
    description: "Players load from the database into room-specific auction order for each new room.",
  },
];

export const footerLinks = [
  { href: "/", label: "Platform" },
  { href: "/create-room", label: "Host Flow" },
  { href: "/join-room", label: "Owner Entry" },
  { href: "/room/demo-room", label: "Demo Room" },
];

export const marqueeBadges = [
  "Private IPL rooms",
  "Live bidding",
  "Host-controlled flow",
  "Multiplayer auction board",
];

export const lobbyStats: QuickStat[] = [
  { label: "Franchises seated", value: "8/10", hint: "Locked team assignments" },
  { label: "Auction timer", value: "00:15", hint: "Backend-driven countdown" },
  { label: "Purse board", value: "Live", hint: "Persisted spend tracking" },
];

export const roomNav = [
  { label: "Auction Board", icon: Activity },
  { label: "Teams", icon: Users },
  { label: "Feed", icon: Radio },
];
