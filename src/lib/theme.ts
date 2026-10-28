export const THEME_STORAGE_KEY = "endju-tema";

/** Corre no <head> antes da primeira pintura, para o tema escuro não piscar. */
export const themeScript = `(()=>{try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="escuro":matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}
