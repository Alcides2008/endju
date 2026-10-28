import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { isSameOrigin } from "@/lib/auth/origin";
import { postLoginPath } from "@/lib/auth/redirect";
import { RECENT_SIGN_IN_SECONDS, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import { isRoleId, isStaff, type RoleId } from "@/lib/domain/permissions";

const body = z.object({ idToken: z.string().min(1), voltar: z.string().nullish() });

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/** Cria users/{uid} no primeiro login e recusa contas desativadas. */
async function ensureUserProfile(token: DecodedIdToken, role: RoleId) {
  const ref = adminDb().collection("users").doc(token.uid);
  const snapshot = await ref.get();
  const now = FieldValue.serverTimestamp();

  if (snapshot.exists) {
    if (snapshot.get("active") === false) return false;
    await ref.update({ lastLoginAt: now });
    return true;
  }

  await ref.set({
    kind: isStaff(role) ? "equipa" : "cliente",
    roleId: role,
    displayName: token.name ?? token.email?.split("@")[0] ?? token.phone_number ?? "Cliente",
    email: token.email,
    phone: token.phone_number,
    photoUrl: token.picture,
    active: true,
    notificationPrefs: { email: true, whatsapp: true, marketing: false },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  });
  return true;
}

export async function POST(request: Request) {
  // Só aceita pedidos do próprio site (evita forçar o login noutra conta a partir de outro domínio)
  if (!isSameOrigin(request)) return error(403, "Origem não autorizada.");

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(400, "Pedido inválido.");

  let token: DecodedIdToken;
  try {
    token = await adminAuth().verifyIdToken(parsed.data.idToken, true);
  } catch {
    return error(401, "Sessão inválida. Entra novamente.");
  }
  if (Date.now() / 1000 - token.auth_time > RECENT_SIGN_IN_SECONDS) {
    return error(401, "Por segurança, entra novamente.");
  }

  const role: RoleId = isRoleId(token.role) ? token.role : "cliente";
  if (!(await ensureUserProfile(token, role))) {
    return error(403, "Esta conta está desativada. Fala com a Endju.");
  }

  const sessionCookie = await adminAuth().createSessionCookie(parsed.data.idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
  (await cookies()).set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({ redirectTo: postLoginPath(role, parsed.data.voltar) });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
