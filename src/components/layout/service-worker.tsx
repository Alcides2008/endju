"use client";

import { useEffect } from "react";

/** Regista public/sw.js em produção (em desenvolvimento a cache baralharia as alterações). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o site funciona igual, só sem cópia para quando falha a rede
    });
  }, []);
  return null;
}
