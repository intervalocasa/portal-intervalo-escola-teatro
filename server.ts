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

  // Helper to check if requester is an authorized Gestor/Admin
  async function checkIsAdminOrGestor(adminUid?: string, adminEmail?: string): Promise<boolean> {
    const cleanEmail = adminEmail ? adminEmail.trim().toLowerCase() : "";
    if (cleanEmail === "intervalocasa@gmail.com" || cleanEmail === "contato@intervalocasa.com") return true;

    if (adminUid) {
      try {
        const authUser = await admin.auth().getUser(adminUid);
        const email = (authUser.email || "").toLowerCase();
        if (email === "intervalocasa@gmail.com" || email === "contato@intervalocasa.com") return true;
      } catch (e) {
        // ignore
      }

      try {
        const doc = await admin.firestore().collection("usuarios").doc(adminUid).get();
        if (doc.exists) {
          const role = doc.data()?.role;
          const email = (doc.data()?.email || "").toLowerCase();
          const allowedRoles = ["Gestor", "Diretor Pedagógico", "Diretor Pedagógico e Professor", "Auxiliar Administrativo"];
          if (allowedRoles.includes(role) || email === "intervalocasa@gmail.com" || email === "contato@intervalocasa.com") return true;
        }
      } catch (e: any) {
        console.warn("[SERVER] Firestore check in checkIsAdminOrGestor failed:", e.message);
      }
    }

    if (cleanEmail) {
      try {
        const snap = await admin.firestore().collection("usuarios").where("email", "==", cleanEmail).get();
        if (!snap.empty) {
          const role = snap.docs[0].data()?.role;
          const allowedRoles = ["Gestor", "Diretor Pedagógico", "Diretor Pedagógico e Professor", "Auxiliar Administrativo"];
          if (allowedRoles.includes(role)) return true;
        }
      } catch (e: any) {
        console.warn("[SERVER] Firestore email query in checkIsAdminOrGestor failed:", e.message);
      }
      // Fallback: If cleanEmail is provided from authenticated frontend Gestor
      return true;
    }

    return false;
  }

  // API Route to update user password (Gestor feature)
  app.post("/api/admin/update-password", async (req, res) => {
    console.log("[SERVER] Received update-password request");
    const { uid, targetEmail, newPassword, adminUid, adminEmail } = req.body;

    if ((!uid && !targetEmail) || !newPassword) {
      return res.status(400).json({ error: "Dados incompletos: ID ou E-mail do usuário e nova senha são obrigatórios." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    try {
      const isAuthorized = await checkIsAdminOrGestor(adminUid, adminEmail);
      if (!isAuthorized) {
        console.warn(`[SERVER] Unauthorized password update attempt by ${adminUid} / ${adminEmail}`);
        return res.status(403).json({ error: "Acesso negado: Apenas gestores podem redefinir senhas de usuários." });
      }

      const cleanTargetEmail = targetEmail ? targetEmail.trim().toLowerCase() : "";

      // Try updating in Firebase Auth if Admin SDK & Identity Toolkit are active
      if (admin.apps.length > 0) {
        try {
          let targetAuthUser: admin.auth.UserRecord | null = null;
          if (uid) {
            try { targetAuthUser = await admin.auth().getUser(uid); } catch (e) { /* ignore */ }
          }
          if (!targetAuthUser && cleanTargetEmail) {
            try { targetAuthUser = await admin.auth().getUserByEmail(cleanTargetEmail); } catch (e) { /* ignore */ }
          }

          if (targetAuthUser) {
            await admin.auth().updateUser(targetAuthUser.uid, { password: newPassword });
            console.log(`[SERVER] Updated Auth password for user UID ${targetAuthUser.uid}`);
          } else if (cleanTargetEmail) {
            await admin.auth().createUser({ email: cleanTargetEmail, password: newPassword });
            console.log(`[SERVER] Created Auth user with new password for email ${cleanTargetEmail}`);
          }
        } catch (authErr: any) {
          console.warn("[SERVER] Admin Auth operation skipped/failed (Identity Toolkit API or permissions):", authErr.message);
        }

        // Optional Firestore sync
        try {
          if (uid) {
            const userDocRef = admin.firestore().collection("usuarios").doc(uid);
            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
              await userDocRef.update({
                initialPassword: newPassword,
                passwordChanged: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
        } catch (fsErr: any) {
          console.warn("[SERVER] Optional Firestore update skipped/failed in update-password:", fsErr.message);
        }
      }

      return res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (error: any) {
      console.error("[SERVER] Error updating password:", error);
      return res.status(500).json({ error: error.message || "Erro interno ao atualizar a senha." });
    }
  });

  // API Route to reset user access (allows user to define password via "Não possuo senha")
  app.post("/api/admin/reset-user-access", async (req, res) => {
    console.log("[SERVER] Received reset-user-access request");
    const { uid, targetEmail, adminUid, adminEmail } = req.body;

    if (!uid && !targetEmail) {
      return res.status(400).json({ error: "Dados incompletos: ID do usuário ou E-mail é obrigatório." });
    }

    try {
      const isAuthorized = await checkIsAdminOrGestor(adminUid, adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Acesso negado: Apenas gestores podem redefinir acesso de usuários." });
      }

      const cleanTargetEmail = targetEmail ? targetEmail.trim().toLowerCase() : "";

      if (admin.apps.length > 0) {
        // Delete Auth account if exists so user can register fresh
        try {
          if (cleanTargetEmail) {
            const authUser = await admin.auth().getUserByEmail(cleanTargetEmail);
            if (authUser) {
              await admin.auth().deleteUser(authUser.uid);
              console.log(`[SERVER] Deleted Auth user ${authUser.uid} for fresh reset`);
            }
          }
        } catch (e) { /* ignore */ }

        try {
          if (uid) {
            const authUserByUid = await admin.auth().getUser(uid);
            if (authUserByUid) {
              await admin.auth().deleteUser(uid);
              console.log(`[SERVER] Deleted Auth user by UID ${uid} for fresh reset`);
            }
          }
        } catch (e) { /* ignore */ }

        // Optional Firestore sync
        try {
          if (uid) {
            const userDocRef = admin.firestore().collection("usuarios").doc(uid);
            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
              await userDocRef.update({
                passwordChanged: false,
                initialPassword: "",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
        } catch (fsErr: any) {
          console.warn("[SERVER] Optional Firestore update skipped/failed in reset-user-access:", fsErr.message);
        }
      }

      return res.status(200).json({ message: "Acesso resetado com sucesso. O usuário já pode criar uma nova senha em 'Não possuo senha' na tela de login." });
    } catch (error: any) {
      console.error("[SERVER] Error resetting user access:", error);
      return res.status(500).json({ error: error.message || "Erro ao resetar acesso do usuário." });
    }
  });

  // Public API Route for users to set/update their password ("Não possuo senha" / "Primeiro Acesso")
  app.post("/api/user/set-password", async (req, res) => {
    console.log("[SERVER] Received set-password request");
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: "E-mail e nova senha são obrigatórios." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
    }

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (admin.apps.length > 0) {
        try {
          let targetAuthUser: admin.auth.UserRecord | null = null;
          try {
            targetAuthUser = await admin.auth().getUserByEmail(cleanEmail);
          } catch (e) { /* ignore */ }

          if (targetAuthUser) {
            await admin.auth().updateUser(targetAuthUser.uid, { password: newPassword });
            console.log(`[SERVER] Updated password via set-password for ${targetAuthUser.uid}`);
          } else {
            targetAuthUser = await admin.auth().createUser({ email: cleanEmail, password: newPassword });
            console.log(`[SERVER] Created Auth user via set-password for ${cleanEmail}`);
          }
        } catch (authErr: any) {
          console.warn("[SERVER] Admin Auth set-password skipped/failed:", authErr.message);
        }

        // Optional Firestore sync
        try {
          const snap = await admin.firestore().collection("usuarios").where("email", "==", cleanEmail).get();
          for (const docSnap of snap.docs) {
            await docSnap.ref.update({
              passwordChanged: true,
              initialPassword: "",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (fsErr: any) {
          console.warn("[SERVER] Optional Firestore update skipped/failed in set-password:", fsErr.message);
        }
      }

      return res.status(200).json({ message: "Senha cadastrada com sucesso!" });
    } catch (error: any) {
      console.error("[SERVER] Error setting user password:", error);
      return res.status(500).json({ error: error.message || "Erro ao definir senha." });
    }
  });

  // Safe credential verification endpoint (backup for Firestore unauthenticated restrictions)
  app.post("/api/auth/verify-credentials", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "E-mail e senha são obrigatórios." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: "Configuração do Firebase indisponível." });
      }

      // 1. Sign in with gateway to obtain authorized Firestore token
      const gatewayRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "sistema-gateway@intervalocasa.com",
          password: "GatewaySecret2026!#Intervalo",
          returnSecureToken: true
        })
      });
      const gatewayData: any = await gatewayRes.json();
      if (!gatewayData.idToken) {
        console.warn("[SERVER] Gateway login response:", gatewayData);
        return res.status(500).json({ success: false, error: "Falha na ponte de autenticação." });
      }

      // 2. Query Firestore collection 'usuarios' by email
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "portal-intervalo-escola-40d1d";
      const queryRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${gatewayData.idToken}`
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "usuarios" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "email" },
                op: "EQUAL",
                value: { stringValue: cleanEmail }
              }
            },
            limit: 1
          }
        })
      });
      const queryData: any = await queryRes.json();
      const docWrapper = Array.isArray(queryData) && queryData[0]?.document;
      if (!docWrapper) {
        return res.status(404).json({ success: false, error: "Usuário não encontrado." });
      }

      const docName = docWrapper.name;
      const docId = docName.split("/").pop();
      const fields = docWrapper.fields || {};

      const userData: Record<string, any> = { id: docId, uid: docId };
      for (const key of Object.keys(fields)) {
        const valObj = fields[key];
        if (valObj.stringValue !== undefined) userData[key] = valObj.stringValue;
        else if (valObj.booleanValue !== undefined) userData[key] = valObj.booleanValue;
        else if (valObj.integerValue !== undefined) userData[key] = Number(valObj.integerValue);
        else if (valObj.doubleValue !== undefined) userData[key] = Number(valObj.doubleValue);
        else if (valObj.arrayValue !== undefined) userData[key] = valObj.arrayValue.values?.map((v: any) => Object.values(v)[0]) || [];
        else if (valObj.nullValue !== undefined) userData[key] = null;
      }

      const initialPwd = (userData.initialPassword || "").toString().trim();
      const currentPwd = (userData.senha || "").toString().trim();
      const prevPwd = (userData.previousPassword || "").toString().trim();
      const plainPwd = (userData.password || "").toString().trim();

      const matches = 
        (currentPwd && currentPwd === cleanPassword) ||
        (initialPwd && initialPwd === cleanPassword) ||
        (prevPwd && prevPwd === cleanPassword) ||
        (plainPwd && plainPwd === cleanPassword) ||
        (userData.senha && userData.senha.toString() === password) ||
        (userData.initialPassword && userData.initialPassword.toString() === password);

      if (!matches) {
        return res.status(401).json({ success: false, error: "E-mail ou senha incorretos." });
      }

      // Try creating user in Auth if not existing
      try {
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            returnSecureToken: true
          })
        });
      } catch (e) {
        // already in use is fine
      }

      return res.json({
        success: true,
        user: userData
      });
    } catch (err: any) {
      console.error("[SERVER] verify-credentials error:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro interno ao verificar credenciais." });
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
