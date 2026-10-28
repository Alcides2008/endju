"use client";

import { cloneElement, isValidElement, useId, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-sm border border-line bg-card text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-200 outline-none " +
  "hover:border-ink/35 focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-brand/20 " +
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-12 px-4 text-[0.9375rem]", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 px-4 py-3 text-[0.9375rem]", className)} {...props} />;
}

export function Checkbox({ className, children, ...props }: ComponentProps<"input"> & { children: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-ink-2", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-[1.125rem] shrink-0 cursor-pointer rounded-xs accent-brand"
        {...props}
      />
      <span>{children}</span>
    </label>
  );
}

type FieldChildProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Rótulo + ajuda + erro ligados ao controlo por id e aria (o filho recebe-os automaticamente).
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactElement<FieldChildProps>;
}) {
  const autoId = useId();
  const id = (isValidElement(children) && children.props.id) || autoId;
  const hintId = hint ? `${id}-ajuda` : undefined;
  const errorId = error ? `${id}-erro` : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
