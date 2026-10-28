import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  type OrderStatus,
  type PaymentStatus,
  type Tone,
} from "@/lib/domain/order-status";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.07] text-ink-2",
  info: "bg-info/12 text-info",
  brand: "bg-brand/12 text-brand-strong dark:text-brand",
  warning: "bg-warning/14 text-warning",
  success: "bg-success/12 text-success",
  danger: "bg-danger/12 text-danger",
  process: "bg-process-cyan/14 text-info",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = ORDER_STATUS_META[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, tone } = PAYMENT_STATUS_META[status];
  return <Badge tone={tone}>{label}</Badge>;
}
