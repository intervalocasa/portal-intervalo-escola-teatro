import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

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
// O ideal é que o usuário configure as variáveis de ambiente VITE_FIREBASE_* em Settings > Secrets.
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Ativa a persistência offline para permitir uso sem rede e cache local
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // Múltiplas abas abertas, a persistência só funciona em uma por vez se não for multi-tab (mas aqui estamos usando multi-tab)
      console.warn("Persistência do Firestore: Falha de pré-condição (múltiplas abas).");
    } else if (err.code === "unimplemented") {
      // O navegador não suporta persistência
      console.warn("Persistência do Firestore: O navegador não suporta caching offline.");
    }
  });
}

if (!firebaseConfig.apiKey) {
  console.warn("Firebase: VITE_FIREBASE_API_KEY não definida. O banco de dados não funcionará até que você configure as Secrets.");
}
