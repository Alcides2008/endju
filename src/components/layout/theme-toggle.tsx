"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  // Sem escolha guardada, acompanha o tema do sistema em tempo real
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      try {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) applyTheme(media.matches);
      } catch {}
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  const toggle = () => {
    applyTheme(!dark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "claro" : "escuro");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-cursor="hover"
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className={cn(
        "grid size-10 place-items-center rounded-full text-ink transition hover:bg-ink/[0.06] focus-visible:ring-4 focus-visible:ring-brand/30 focus-visible:outline-none",
        className,
      )}
    >
      {dark ? <Sun className="size-[1.125rem]" /> : <Moon className="size-[1.125rem]" />}
    </button>
  );
}
