/**
 * Publica firestore.rules no projeto do .env.local com a conta de serviço (não precisa de `firebase login`).
 * Uso: npm run rules:deploy
 */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) throw new Error("Faltam as variáveis FIREBASE_* em .env.local.");
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });

const ruleset = await getSecurityRules().releaseFirestoreRulesetFromSource(readFileSync("firestore.rules", "utf8"));
console.log(`Regras do Firestore publicadas em ${projectId} (${ruleset.name}).`);
