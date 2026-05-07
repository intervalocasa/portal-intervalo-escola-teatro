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

  // Initialize Firebase Admin
  // Prioriza variáveis de ambiente para segurança (GitHub)
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  
  if (admin.apps.length === 0) {
    if (projectId) {
      admin.initializeApp({ projectId });
    } else {
      // Fallback apenas para desenvolvimento local se o arquivo existir
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        try {
          const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          admin.initializeApp({ projectId: firebaseConfig.projectId });
        } catch (err) {
          console.error("Error reading firebase-applet-config.json:", err);
        }
      } else {
        console.warn("Firebase Admin: projectId não encontrado nas variáveis de ambiente nem no config.json.");
      }
    }
  }

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      adminInitialized: admin.apps.length > 0,
      projectId: projectId || "from-config"
    });
  });

  // API ROute to update user password (Gestor feature)
  app.post("/api/admin/update-password", async (req, res) => {
    const { uid, newPassword, adminUid } = req.body;

    if (admin.apps.length === 0) {
      return res.status(500).json({ error: "Firebase Admin not initialized. Check your environment variables." });
    }

    try {
      // Security check: verify the requester is actually a Gestor
      const adminUser = await admin.firestore().collection("usuarios").doc(adminUid).get();
      if (!adminUser.exists || adminUser.data()?.role !== "Gestor") {
        return res.status(403).json({ error: "Unauthorized: Only Gestors can reset passwords." });
      }

      await admin.auth().updateUser(uid, {
        password: newPassword,
      });

      res.status(200).json({ message: "Password updated successfully." });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to create user in Auth (Gestor feature)
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, adminUid } = req.body;

    if (!admin.apps.length) {
      return res.status(500).json({ error: "Firebase Admin not initialized. Check your environment variables." });
    }

    try {
      // Security check: verify the requester is actually a Gestor
      const adminUser = await admin.firestore().collection("usuarios").doc(adminUid).get();
      if (!adminUser.exists || adminUser.data()?.role !== "Gestor") {
        return res.status(403).json({ error: "Unauthorized: Only Gestors can create users with credentials." });
      }

      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
      });

      res.status(200).json({ uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user in Auth:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fallback para rotas de API não encontradas (evita retornar HTML em chamadas de API)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
