/**
 * DADOS DE TESTE: envia uma prova v1 para o primeiro item de um pedido, como fará o designer no painel (Etapa 6).
 * A imagem é gerada aqui e guarda-se no documento (data URL) porque o Storage/Cloudinary ainda não estão ligados.
 * Uso: npm run seed:test-proof -- EDJ-2026-00001
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import sharp from "sharp";

const number = process.argv[2];
if (!number) throw new Error("Indica o número do pedido: npm run seed:test-proof -- EDJ-2026-00001");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
initializeApp(
  clientEmail && privateKey ? { credential: cert({ projectId, clientEmail, privateKey }), projectId } : { projectId },
);
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const order = (await db.collection("orders").where("number", "==", number).limit(1).get()).docs[0];
if (!order) throw new Error(`Pedido ${number} não encontrado.`);
const item = (await order.ref.collection("items").orderBy("createdAt").limit(1).get()).docs[0];
const size = item.get("size") as { widthCm: number; heightCm: number } | undefined;
const width = 1600;
const height = Math.round(width * ((size?.heightCm ?? 2) / (size?.widthCm ?? 3)));

// Arte da prova: chama do logótipo, logótipo a branco, texto e marcas de corte
const logo = await sharp("public/brand/endju-logo-white.png")
  .resize({ width: Math.round(width * 0.42) })
  .toBuffer();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#e0301a"/><stop offset=".65" stop-color="#f08000"/><stop offset="1" stop-color="#f7b500"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="${height * 0.74}" font-family="Arial, sans-serif" font-weight="800" font-size="${width * 0.04}" fill="#fff" text-anchor="middle">Imprimimos marcas que se veem ao longe.</text>
  <text x="50%" y="${height * 0.84}" font-family="Arial, sans-serif" font-size="${width * 0.022}" fill="#fff" text-anchor="middle">PROVA DE TESTE · ${number}</text>
  <g stroke="#fff" stroke-width="3" opacity=".8">
    <path d="M30 70V30h40M${width - 70} 30h40v40M30 ${height - 70}v40h40M${width - 70} ${height - 30}h40v-40" fill="none"/>
  </g></svg>`;
const image = await sharp(Buffer.from(svg))
  .composite([{ input: logo, gravity: "north", top: Math.round(height * 0.18), left: Math.round(width * 0.29) }])
  .jpeg({ quality: 78 })
  .toBuffer();

const at = Timestamp.now();
const proofs = await db.collection("proofs").where("orderId", "==", order.id).where("itemId", "==", item.id).get();
const version = proofs.size + 1;
const proofRef = db.collection("proofs").doc();
const batch = db.batch();
proofs.docs
  .filter((p) => p.get("status") === "pendente")
  .forEach((p) => batch.update(p.ref, { status: "substituida" }));
batch.set(proofRef, {
  orderId: order.id,
  orderNumber: number,
  itemId: item.id,
  itemName: item.get("name"),
  customerId: order.get("customerId"),
  userId: order.get("userId"),
  version,
  status: "pendente",
  originalFileId: "",
  preview: { url: `data:image/jpeg;base64,${image.toString("base64")}`, width, height, pages: 1 },
  designerId: "teste",
  message: "Prova de teste gerada por script. Experimenta comentar com um pino, pedir alterações ou aprovar.",
  sentAt: at,
  createdAt: at,
  updatedAt: at,
});
batch.update(item.ref, { proofStatus: "enviada", currentProofId: proofRef.id });
batch.update(order.ref, { status: "em_aprovacao", updatedAt: at });
batch.set(order.ref.collection("events").doc(), {
  type: "proof",
  visibility: "cliente",
  from: order.get("status"),
  to: "em_aprovacao",
  message: `Prova v${version} enviada para aprovação`,
  actorName: "Teste",
  at,
});
await batch.commit();
console.log(`Prova v${version} (${proofRef.id}) enviada para ${number} · ${Math.round(image.length / 1024)} KB`);
