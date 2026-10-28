import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false no HTML do servidor e na hidratação, true depois: para estado que só existe no browser. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
