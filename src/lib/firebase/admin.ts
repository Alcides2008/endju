import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // A Vercel guarda a chave com "\n" literais
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }
  // Emuladores locais (FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST) dispensam credenciais
  if (projectId && process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId });
  }
  throw new Error(
    "Firebase Admin por configurar: define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.",
  );
}

export function adminAuth() {
  return getAuth(adminApp());
}

// O Firestore do Admin SDK é um só por app, mas este módulo pode ser carregado em várias cópias (um bundle por
// rota ou Server Action): a instância fica em globalThis para settings() correr uma única vez.
const shared = globalThis as typeof globalThis & { __endjuAdminDb?: Firestore };

export function adminDb() {
  if (!shared.__endjuAdminDb) {
    const firestore = getFirestore(adminApp());
    try {
      firestore.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Outra cópia do módulo já aplicou as mesmas definições à mesma instância
    }
    shared.__endjuAdminDb = firestore;
  }
  return shared.__endjuAdminDb;
}
