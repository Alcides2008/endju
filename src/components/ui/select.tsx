"use client";

import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string; hint?: string; disabled?: boolean };

export function Select({
  options,
  value,
  onValueChange,
  placeholder = "Escolher…",
  id,
  name,
  disabled,
  className,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
}: {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /** Para seletores sem rótulo visível (linhas de uma tabela de edição) */
  "aria-label"?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} name={name} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-3 rounded-sm border border-line bg-card px-4 text-left text-[0.9375rem] text-ink outline-none",
          "transition-[border-color,box-shadow] duration-200 hover:border-ink/35 focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-brand/20",
          "disabled:opacity-50 aria-invalid:border-danger data-[placeholder]:text-ink-3",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-ink-2" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-sm border border-line bg-card shadow-lift data-[state=open]:animate-pop-in"
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex cursor-pointer flex-col rounded-xs py-2.5 pr-3 pl-9 text-[0.9375rem] text-ink outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-ink/[0.06]"
              >
                <SelectPrimitive.ItemIndicator className="absolute top-3 left-3">
                  <Check className="size-4 text-brand" aria-hidden />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                {option.hint && <span className="text-xs text-ink-3">{option.hint}</span>}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
