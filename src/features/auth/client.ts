"use client";

import { FirebaseError } from "firebase/app";
import { signInWithCustomToken, signOut, type User } from "firebase/auth";
import type { z } from "zod";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { registerSchema } from "./schema";

/** POST para as rotas /api/auth; lança um Error com a mensagem do servidor. */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Algo correu mal. Tenta de novo.");
  return data;
}

/** Troca o login do Firebase por um cookie de sessão no servidor. Devolve o destino. */
export async function startSession(user: User, voltar: string | null): Promise<string> {
  try {
    const idToken = await user.getIdToken();
    const { redirectTo } = await postJson<{ redirectTo: string }>("/api/auth/session", { idToken, voltar });
    return redirectTo;
  } catch (error) {
    await signOut(getFirebaseAuth());
    throw error;
  }
}

export function registerAccount(values: z.output<typeof registerSchema>) {
  return postJson<{ ok: true }>("/api/auth/register", values);
}

/** Login sem SMS: o servidor confirma telemóvel + senha e devolve um custom token. */
export async function signInWithPhone(phone: string, password: string): Promise<User> {
  const { customToken } = await postJson<{ customToken: string }>("/api/auth/phone-login", { phone, password });
  return (await signInWithCustomToken(getFirebaseAuth(), customToken)).user;
}

export async function endSession() {
  await fetch("/api/auth/session", { method: "DELETE" });
  await signOut(getFirebaseAuth());
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email ou senha incorretos.",
  "auth/wrong-password": "Email ou senha incorretos.",
  "auth/user-not-found": "Email ou senha incorretos.",
  "auth/invalid-email": "Esse email não parece válido.",
  "auth/user-disabled": "Esta conta está desativada. Fala com a Endju.",
  "auth/email-already-in-use": "Já existe uma conta com este email. Entra ou recupera a senha.",
  "auth/weak-password": "A senha precisa de pelo menos 8 caracteres.",
  "auth/too-many-requests": "Demasiadas tentativas. Espera alguns minutos e tenta de novo.",
  "auth/network-request-failed": "Sem ligação à internet. Verifica a rede e tenta de novo.",
  "auth/popup-closed-by-user": "A janela do Google foi fechada antes de terminar.",
  "auth/cancelled-popup-request": "A janela do Google foi fechada antes de terminar.",
  "auth/popup-blocked": "O browser bloqueou a janela do Google. Permite pop-ups para este site.",
  "auth/account-exists-with-different-credential": "Já tens conta com este email. Entra com o método que usaste antes.",
  "auth/operation-not-allowed": "Este método de entrada ainda não está ativo.",
};

/** Mensagem em português para qualquer erro do fluxo de autenticação. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? "Algo correu mal. Tenta de novo.";
  if (error instanceof Error) return error.message;
  return "Algo correu mal. Tenta de novo.";
}
