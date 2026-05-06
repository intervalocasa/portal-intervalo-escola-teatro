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

  // Initialize Firebase Admin
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });

  // API ROute to update user password (Gestor feature)
  app.post("/api/admin/update-password", async (req, res) => {
    const { uid, newPassword, adminUid } = req.body;

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
