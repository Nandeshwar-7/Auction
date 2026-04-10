"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full border text-sm font-semibold tracking-[0.02em] transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out will-change-transform disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-[linear-gradient(180deg,rgba(250,250,250,1),rgba(228,228,231,0.97))] !text-black [&>svg]:!text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_16px_38px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:border-white/24 hover:!text-black hover:[&>svg]:!text-black hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.66),0_20px_44px_rgba(0,0,0,0.34)]",
        secondary:
          "border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-white/18 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]",
        ghost: "border-transparent text-[color:var(--foreground)] hover:bg-white/8",
      },
      size: {
        default: "h-11 px-6",
        lg: "h-[3.35rem] px-7 text-base sm:px-8",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
