import type { ComponentProps } from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const variants = {
  primary: "bg-brand text-brand-fg hover:bg-brand-strong",
  ink: "bg-ink text-paper hover:bg-ink/85",
  outline: "border border-ink/20 text-ink hover:border-ink hover:bg-ink/[0.04]",
  ghost: "text-ink hover:bg-ink/[0.06]",
  danger: "bg-danger text-white hover:bg-danger/90",
} as const;

const sizes = {
  sm: "h-9 gap-1.5 px-4 text-sm",
  md: "h-11 gap-2 px-6 text-[0.9375rem]",
  lg: "h-14 gap-2.5 px-8 text-base",
  icon: "size-11",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Renderiza o filho (ex.: `<Link>`) com o aspeto do botão. */
  asChild?: boolean;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-cursor="hover"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap",
        "transition-[background-color,border-color,color,transform] duration-200 ease-out-expo active:scale-[0.98]",
        "focus-visible:ring-4 focus-visible:ring-brand/30 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.15em] [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {/* Slot exige um único filho: o spinner só aparece em <button> */}
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="absolute" />}
          <span className={cn("inline-flex items-center gap-[inherit]", loading && "invisible")}>{children}</span>
        </>
      )}
    </Comp>
  );
}
