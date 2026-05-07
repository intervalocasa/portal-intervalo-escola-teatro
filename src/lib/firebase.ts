import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// Inicializa apenas se houver configuração mínima para não quebrar o build/runtime
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : ({} as any);
export const db = app ? getFirestore(app) : ({} as any);

if (!app) {
  console.warn("Firebase: Configurações não encontradas. Verifique as variáveis de ambiente.");
}
