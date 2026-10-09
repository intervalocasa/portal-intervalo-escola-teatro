import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  enableMultiTabIndexedDbPersistence,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configurações do Firebase. Usa Variáveis de Ambiente (VITE_...)
// No AI Studio, preencha em Settings > Secrets. No Vercel, preencha em Environment Variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa sempre, mas as funções que dependem dele podem falhar se as chaves forem inválidas.
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Gateway de autenticação reservado para consultas autorizadas e resolução segura de credenciais
export const GATEWAY_CREDENTIALS = {
  email: "sistema-gateway@intervalocasa.com",
  password: "GatewaySecret2026!#Intervalo"
};

let gatewayPromise: Promise<boolean> | null = null;

export async function ensureAuthenticatedBridge(): Promise<boolean> {
  if (auth.currentUser) return true;
  if (gatewayPromise) return gatewayPromise;

  gatewayPromise = (async () => {
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, GATEWAY_CREDENTIALS.email, GATEWAY_CREDENTIALS.password);
      return true;
    } catch (err) {
      console.warn("[Firebase Bridge] Não foi possível autenticar o gateway:", err);
      return false;
    } finally {
      gatewayPromise = null;
    }
  })();

  return gatewayPromise;
}

// initializeFirestore permite configurações experimentais como Long Polling, 
// útil em ambientes de proxy que bloqueiam WebSockets ou streams.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Ativa a persistência offline para permitir uso sem rede e cache local
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Persistência do Firestore: Falha de pré-condição (múltiplas abas).");
    } else if (err.code === "unimplemented") {
      console.warn("Persistência do Firestore: O navegador não suporta caching offline.");
    }
  });
}

if (!firebaseConfig.apiKey) {
  console.warn("Firebase: VITE_FIREBASE_API_KEY não definida. O banco de dados não funcionará até que você configure as Secrets.");
}
