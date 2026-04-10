"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

type CTAButtonProps = ButtonProps & {
  href: string;
  withArrow?: boolean;
};

export function CTAButton({
  href,
  children,
  withArrow = true,
  className,
  variant,
  size = "lg",
  ...props
}: CTAButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -1.5 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="inline-flex"
    >
      <Button asChild className={className} variant={variant} size={size} {...props}>
        <Link href={href}>
          {children}
          {withArrow ? (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-0.5" />
          ) : null}
        </Link>
      </Button>
    </motion.div>
  );
}
