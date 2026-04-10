import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = PropsWithChildren<{
  className?: string;
}>;

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-5 sm:px-7 lg:px-10", className)}>
      {children}
    </div>
  );
}
