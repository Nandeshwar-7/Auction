"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Gavel,
  LayoutDashboard,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Feature } from "@/types/site";

type FeatureCardProps = {
  feature: Feature;
  index: number;
};

export function FeatureCard({ feature, index }: FeatureCardProps) {
  const reduceMotion = useReducedMotion();
  const iconMap = {
    trophy: Trophy,
    dashboard: LayoutDashboard,
    radio: Radio,
    gavel: Gavel,
    shield: ShieldCheck,
    sparkles: Sparkles,
  } as const;

  const Icon = iconMap[feature.icon];

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.34, delay: reduceMotion ? 0 : index * 0.05, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="group h-full border-white/8 bg-[linear-gradient(180deg,rgba(22,22,24,0.96),rgba(8,8,10,0.98))] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_90px_rgba(0,0,0,0.4)]">
        <CardHeader className="gap-5">
          <div className="h-px w-14 bg-white/26" />
          <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-white transition-transform duration-300 group-hover:scale-[1.03]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/46">
              {feature.eyebrow}
            </p>
            <CardTitle className="mt-4 font-display text-[2rem] uppercase leading-[0.94] tracking-wide sm:text-[2.2rem]">
              {feature.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <p className="text-sm leading-7 text-[color:var(--muted-foreground)] sm:text-[15px]">
            {feature.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
