import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logger middleware
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API-START] ${req.method} ${req.url}`);
    }
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.url.startsWith('/api')) {
        console.log(`[API-END ${res.statusCode}] ${req.method} ${req.url} - ${duration}ms`);
      }
    });
    next();
  });

  // Initialize Firebase Admin
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  
  if (admin.apps.length === 0) {
    if (projectId) {
      admin.initializeApp({ projectId });
      console.log(`[SERVER] Firebase Admin initialized with Project ID: ${projectId}`);
    } else {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        try {
          const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          admin.initializeApp({ projectId: firebaseConfig.projectId });
          console.log(`[SERVER] Firebase Admin initialized from config.json`);
        } catch (err) {
          console.error("[SERVER] Error reading firebase-applet-config.json:", err);
        }
      } else {
        console.warn("[SERVER] Firebase Admin: No Project ID found in environment or config. Using default initialization.");
        try {
          admin.initializeApp();
        } catch (e) {
          console.error("[SERVER] Firebase Admin default init failed:", e);
        }
      }
    }
  }

  // Health check route
  app.get("/api/health", (req, res) => {
    console.log("[SERVER] Health check requested");
    res.json({ 
      status: "ok", 
      adminInitialized: admin.apps.length > 0,
      projectId: projectId || "from-config"
    });
  });

  // API Route to update user password (Gestor feature)
  app.post("/api/admin/update-password", async (req, res) => {
    console.log("[SERVER] Received update-password request");
    const { uid, newPassword, adminUid } = req.body;

    if (!uid || !newPassword || !adminUid) {
      return res.status(400).json({ error: "Dados incompletos: ID do usuário, nova senha e ID do administrador são obrigatórios." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    if (!admin.apps.length) {
      console.error("[SERVER] Firebase Admin not initialized for update-password");
      return res.status(500).json({ error: "Firebase Admin não inicializado. Verifique as configurações do servidor." });
    }

    try {
      // 1. Security check: verify the requester is actually an authorized Gestor
      let isAuthorized = false;
      const adminDoc = await admin.firestore().collection("usuarios").doc(adminUid).get();
      if (adminDoc.exists) {
        const role = adminDoc.data()?.role;
        const email = adminDoc.data()?.email;
        const allowedRoles = ["Gestor", "Diretor Pedagógico", "Diretor Pedagógico e Professor", "Auxiliar Administrativo"];
        if (allowedRoles.includes(role) || email === "intervalocasa@gmail.com") {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        try {
          const authAdmin = await admin.auth().getUser(adminUid);
          if (authAdmin.email === "intervalocasa@gmail.com") {
            isAuthorized = true;
          }
        } catch (e) {
          // ignore
        }
      }

      if (!isAuthorized) {
        console.warn(`[SERVER] Unauthorized password update attempt by ${adminUid}`);
        return res.status(403).json({ error: "Acesso negado: Apenas gestores podem redefinir senhas de usuários." });
      }

      // 2. Find target user doc in Firestore
      const userDocRef = admin.firestore().collection("usuarios").doc(uid);
      const userDoc = await userDocRef.get();
      const userEmail = userDoc.exists ? userDoc.data()?.email : null;

      let targetAuthUser: admin.auth.UserRecord | null = null;

      // Try finding in Auth by UID first
      try {
        targetAuthUser = await admin.auth().getUser(uid);
      } catch (e) {
        // Not found by doc ID
      }

      // If not found by UID, try by email
      if (!targetAuthUser && userEmail) {
        try {
          targetAuthUser = await admin.auth().getUserByEmail(userEmail.trim().toLowerCase());
        } catch (e) {
          // Not found by email
        }
      }

      // Update password in Auth or create Auth account if missing
      if (targetAuthUser) {
        await admin.auth().updateUser(targetAuthUser.uid, {
          password: newPassword,
        });
        console.log(`[SERVER] Updated Auth password for user UID ${targetAuthUser.uid}`);
      } else if (userEmail) {
        targetAuthUser = await admin.auth().createUser({
          email: userEmail.trim().toLowerCase(),
          password: newPassword,
          displayName: userDoc.exists ? (userDoc.data()?.name || "") : "",
        });
        console.log(`[SERVER] Created Auth user with new password for email ${userEmail}`);
      } else {
        return res.status(404).json({ error: "Usuário não encontrado no Firebase Auth e sem e-mail válido cadastrado." });
      }

      // 3. Update Firestore document(s)
      if (userDoc.exists) {
        await userDocRef.update({
          initialPassword: newPassword,
          passwordChanged: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      if (targetAuthUser && targetAuthUser.uid !== uid) {
        const authUidRef = admin.firestore().collection("usuarios").doc(targetAuthUser.uid);
        const authUidDoc = await authUidRef.get();
        if (authUidDoc.exists) {
          await authUidRef.update({
            initialPassword: newPassword,
            passwordChanged: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else if (userDoc.exists) {
          await authUidRef.set({
            ...userDoc.data(),
            id: targetAuthUser.uid,
            initialPassword: newPassword,
            passwordChanged: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (error: any) {
      console.error("[SERVER] Error updating password:", error);
      res.status(500).json({ error: error.message || "Erro interno ao atualizar a senha." });
    }
  });

  // Fallback para rotas de API não encontradas (evita retornar HTML em chamadas de API)
  app.all("/api/*", (req, res) => {
    console.warn(`[SERVER 404] API Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    console.log("[SERVER] Starting Vite in development mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SERVER] Starting in production mode (serving dist/)");
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      // Configura cache-control específico para evitar que index.html ou service-worker permaneçam em cache
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          const fileName = path.basename(filePath);
          if (fileName === "service-worker.js" || fileName === "manifest.json" || filePath.endsWith(".json")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else if (filePath.includes("/assets/") || filePath.includes("\\assets\\")) {
            // Arquivos gerados pelo Vite com hash são seguros de cachear perpetuamente
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else {
            res.setHeader("Cache-Control", "no-cache");
          }
        }
      }));
      app.get("*", (req, res) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("[SERVER] dist/ directory not found! Falling back to dynamic serving or error.");
      app.get("*", (req, res) => {
        res.status(500).send("Production build missing. Run npm run build.");
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL ERROR STARTING SERVER:", err);
  process.exit(1);
});
