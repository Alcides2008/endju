"use client";

import { useSyncExternalStore } from "react";

/**
 * Carrinho no browser (decisão 3 do plano): não é guardado entre aparelhos e o servidor volta a validar
 * produtos, opções e preços no checkout. Sincroniza entre separadores pelo evento `storage`.
 */
export type ArtworkCheck = {
  name: string;
  sizeBytes: number;
  format: string;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
  status: "ok" | "avisos" | "por_verificar";
  messages: string[];
};

export type CartItem = {
  id: string;
  productSlug: string;
  options: Record<string, string>;
  size?: { widthCm: number; heightCm: number };
  quantity: number;
  urgent: boolean;
  design: "cliente_envia" | "endju_cria";
  artwork: ArtworkCheck | null;
  notes: string;
};

const KEY = "endju.carrinho.v1";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY; // modo privado ou armazenamento bloqueado: carrinho vazio
  }
  if (raw === cache.raw) return cache.items;
  let items = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) items = parsed as CartItem[];
  } catch {
    items = EMPTY;
  }
  cache = { raw, items };
  return items;
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // sem armazenamento: o carrinho dura só enquanto a página estiver aberta
    cache = { raw: JSON.stringify(items), items };
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const cart = {
  add(item: Omit<CartItem, "id">) {
    write([...read(), { ...item, id: crypto.randomUUID() }]);
  },
  update(id: string, patch: Partial<Omit<CartItem, "id">>) {
    write(read().map((item) => (item.id === id ? { ...item, ...patch } : item)));
  },
  remove(id: string) {
    write(read().filter((item) => item.id !== id));
  },
  clear() {
    write([]);
  },
};
