/**
 * Dá o papel de Administrador à conta BOOTSTRAP_ADMIN_EMAIL (a pessoa tem de ter entrado uma vez no site).
 * Uso: npm run bootstrap-admin
 * Depois disto a pessoa sai e volta a entrar para o novo papel chegar ao cookie de sessão.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
if (!email) throw new Error("Define BOOTSTRAP_ADMIN_EMAIL em .env.local.");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
initializeApp(
  clientEmail && privateKey ? { credential: cert({ projectId, clientEmail, privateKey }), projectId } : { projectId },
);

const user = await getAuth().getUserByEmail(email);
const profile = getFirestore().collection("users").doc(user.uid);
// Sem perfil, o merge abaixo criava um documento incompleto (sem nome, email, preferências)
if (!(await profile.get()).exists) throw new Error(`${email} ainda não entrou no site. Entra uma vez e repete.`);

await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, role: "admin" });
await getAuth().revokeRefreshTokens(user.uid); // a sessão antiga (papel cliente) deixa de valer
await profile.update({ kind: "equipa", roleId: "admin", updatedAt: FieldValue.serverTimestamp() });

console.log(`${email} é agora Administrador. Sai e volta a entrar.`);
