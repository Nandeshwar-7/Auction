export type NavItem = {
  href: string;
  label: string;
};

export type FeatureIcon =
  | "trophy"
  | "dashboard"
  | "radio"
  | "gavel"
  | "shield"
  | "sparkles";

export type Feature = {
  title: string;
  description: string;
  eyebrow: string;
  icon: FeatureIcon;
};

export type QuickStat = {
  label: string;
  value: string;
  hint: string;
};
