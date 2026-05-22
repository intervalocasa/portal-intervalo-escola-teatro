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

  // API ROute to update user password (Gestor feature)
  app.post("/api/admin/update-password", async (req, res) => {
    console.log("[SERVER] Received update-password request");
    const { uid, newPassword, adminUid } = req.body;

    if (!admin.apps.length) {
      console.error("[SERVER] Firebase Admin not initialized for update-password");
      return res.status(500).json({ error: "Firebase Admin not initialized. Check your environment variables." });
    }

    try {
      // Security check: verify the requester is actually a Gestor
      const adminUser = await admin.firestore().collection("usuarios").doc(adminUid).get();
      if (!adminUser.exists || adminUser.data()?.role !== "Gestor") {
        console.warn(`[SERVER] Unauthorized password update attempt by ${adminUid}`);
        return res.status(403).json({ error: "Unauthorized: Only Gestors can reset passwords." });
      }

      await admin.auth().updateUser(uid, {
        password: newPassword,
      });

      console.log(`[SERVER] Password updated for user ${uid}`);
      res.status(200).json({ message: "Password updated successfully." });
    } catch (error: any) {
      console.error("[SERVER] Error updating password:", error);
      res.status(500).json({ error: error.message });
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
