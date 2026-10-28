import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let auth: Auth | undefined;

/** Auth do browser, iniciado só quando é preciso (o build não precisa de credenciais). */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  if (!isFirebaseConfigured) {
    throw new Error("Firebase por configurar: preenche NEXT_PUBLIC_FIREBASE_* em .env.local.");
  }
  auth = getAuth(getApps().length ? getApp() : initializeApp(config));
  auth.languageCode = "pt"; // emails e SMS do Firebase em português
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
  return auth;
}

let db: Firestore | undefined;

/** Firestore do browser, só para leituras em tempo real (as escritas passam pelo servidor). */
export function getClientDb(): Firestore {
  if (db) return db;
  getFirebaseAuth(); // garante a app iniciada e a sessão do Auth ligada aos pedidos do Firestore
  db = getFirestore(getApp());
  const emulator = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  if (emulator) {
    const [host, port] = emulator.split(":");
    connectFirestoreEmulator(db, host, Number(port));
  }
  return db;
}
