"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

/** Utilizador do Firebase no browser (`undefined` enquanto carrega). */
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(isFirebaseConfigured ? undefined : null);
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);
  return user;
}
