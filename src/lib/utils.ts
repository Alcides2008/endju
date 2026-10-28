import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Os tamanhos de texto do design system têm de ser declarados, senão `text-display-xl` é tratado como cor.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-2xl", "display-xl", "display-lg", "display-md", "display-sm", "eyebrow"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
