"use client";

import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex [scrollbar-width:none] gap-6 overflow-x-auto border-b border-line", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-cursor="hover"
      className={cn(
        "relative -mb-px shrink-0 border-b-2 border-transparent pt-1 pb-3 text-sm font-medium whitespace-nowrap text-ink-3 transition-colors outline-none",
        "hover:text-ink focus-visible:text-ink data-[state=active]:border-brand data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("pt-6 outline-none data-[state=active]:animate-fade-in", className)}
      {...props}
    />
  );
}
