import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

import { testConnection } from "./database/connection.js";
import RecipeModel from "./database/models/RecipeModel.js";
import ShareModel from "./database/models/ShareModel.js";
import UserModel from "./database/models/UserModel.js";
import subrecipesRouter from "./routes/subrecipes.js";
import passport from "./config/passport.js";
import { ensureAuthenticated } from "./middleware/auth.js";
import PDFService from "./services/PDFService.js";
import ImageService from "./services/ImageService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const QUIET_MODE = true;

const app = express();
const PORT = process.env.PORT || 2029;

const DEV_URL = process.env.DEV_URL || "http://localhost:5173";
const PROD_URL = process.env.PROD_URL || "https://reciipes.fr";

const SERVER_URL =
  process.env.SERVER_URL ||
  (process.env.NODE_ENV === "production" ? PROD_URL : DEV_URL);
const FRONTEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_URL || PROD_URL
    : process.env.DEV_URL || DEV_URL;
const VITE_API_URL = process.env.VITE_API_URL || `${SERVER_URL}/api`;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${
    process.env.NODE_ENV === "production" ? PROD_URL : DEV_URL
  }/auth/google/callback`;

function logAligned(type, title, content) {
  const labels = {
    success: "OK",
    error: "ERROR",
    warning: "WARN",
    info: "INFO",
    user: "USER",
    api: "API",
    session: "SESSION",
    upload: "UPLOAD",
    oauth: "OAUTH",
  };

  const label = labels[type] || type?.toUpperCase() || "LOG";

  console.log(`\n[${label}] ${title}`);

  if (typeof content === "string") {
    console.log(`- ${content}`);
  } else if (typeof content === "object" && content !== null) {
    Object.entries(content).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });
  }
}

function logBox(type, title, fields = {}) {
  const labels = {
    success: "OK",
    error: "ERROR",
    warning: "WARN",
    info: "INFO",
    user: "USER",
    api: "API",
    session: "SESSION",
    upload: "UPLOAD",
    oauth: "OAUTH",
  };
  const label = labels[type] || type?.toUpperCase() || "LOG";
  console.log(`\n[${label}] ${title}`);
  if (Object.keys(fields).length > 0) {
    Object.entries(fields).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });
  }
}

const uploadsDir = path.join(__dirname, "../uploads/");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  logAligned(
    "upload",
    "uploads directory",
    "Directory created at project root"
  );
} else {
  try {
    fs.chmodSync(uploadsDir, 0o755);
    logAligned(
      "upload",
      "uploads directory",
      "Permissions updated successfully"
    );
  } catch (error) {
    logAligned(
      "upload",
      "uploads directory",
      `Permission update failed: ${error.message}`
    );
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "recipe-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images sont autorisées!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.set("trust proxy", 1);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://reciipes.fr", "https://www.reciipe.fr"]
        : true, // En développement, permet toutes les origines
    credentials: true, // Permet l'envoi de cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());

app.use((req, res, next) => {
  if (req.method && req.method.toUpperCase() === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Origin",
      req.headers.origin || FRONTEND_URL || "*"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    return res.sendStatus(204);
  }
  next();
});

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "votre-secret-super-securise",
    resave: true,
    saveUninitialized: true,
    name: "reciipes.sid",
    cookie: {
      secure:
        process.env.NODE_ENV === "production"
          ? process.env.COOKIE_SECURE !== "false"
          : false,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true, // Sécurité XSS
      domain: process.env.NODE_ENV === "production" ? undefined : undefined,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (!QUIET_MODE) {
    const isImportantRoute =
      req.path.startsWith("/api") ||
      req.path.startsWith("/auth") ||
      req.path === "/";
    if (isImportantRoute) {
      const timestamp = new Date().toLocaleTimeString("fr-FR");
      const sessionInfo = req.sessionID
        ? req.sessionID.substring(0, 8) + "..."
        : "NO_SESSION";
      const authStatus = req.isAuthenticated() ? "AUTH" : "GUEST";
      console.log(
        `${req.method} ${req.path} | ${timestamp} | ${authStatus} | Session: ${sessionInfo}`
      );
      if (
        (process.env.NODE_ENV === "production" ||
          process.env.SESSION_DEBUG === "true") &&
        req.path.startsWith("/api")
      ) {
        if (req.headers.cookie) {
          const cookies = req.headers.cookie.split(";").map((c) => c.trim());
          const reciipeCookie = cookies.find((c) =>
            c.startsWith("reciipes.sid=")
          );
          if (reciipeCookie) {
            console.log(`Cookie found: ${reciipeCookie.substring(0, 25)}...`);
          } else {
            console.log(
              `No reciipes.sid cookie found in: ${req.headers.cookie.substring(
                0,
                50
              )}...`
            );
          }
        } else {
          console.log(`No cookies at all in request`);
        }
        if (req.headers.origin) console.log(`Origin: ${req.headers.origin}`);
        if (req.headers.referer) console.log(`Referer: ${req.headers.referer}`);
      }
    }
  }
  next();
});

// Servir le frontend compilé
app.use(express.static(path.join(__dirname, "dist")));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

testConnection()
  .then(() => {
    logBox("info", "database connection test", {
      Status: "Connected to MySQL database successfully",
      Database: "reciipe_v2",
      User: "reciipes",
      Host: process.env.DB_HOST || "localhost",
    });
  })
  .catch((error) => {
    logBox("error", "database connection test", {
      Status: "Database connection failed",
      Error: error.message,
      Database: "reciipes_v2",
      User: "reciipes",
      Host: process.env.DB_HOST || "localhost",
    });
  });

// Routes d'authentification

// GET /auth/google - Démarrer l'auth Google
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GET /auth/google/callback - Callback Google OAuth
app.get("/auth/google/callback", (req, res, next) => {
  console.log("OAuth callback start");

  passport.authenticate("google", (err, user, info) => {
    if (err) {
      logAligned("error", "authentication error", `Error: ${err.message}`);
      return res.status(500).send(`Erreur d'authentification: ${err.message}`);
    }
    if (!user) {
      logAligned(
        "warning",
        "authentication failed",
        `Reason: ${info || "Unknown"}`
      );
      return res.redirect("/login?error=auth_failed");
    }
    req.logIn(user, (err) => {
      if (err) {
        logAligned("error", "login error", `Error: ${err.message}`);
        return res.status(500).send(`Erreur de connexion: ${err.message}`);
      }

      logBox("success", "user login success", {
        User: user.name,
        ID: user.id.toString(),
        Email: user.email,
        Session: req.sessionID.substring(0, 6) + "...",
        Time: new Date().toLocaleString("fr-FR"),
        Provider: "Google",
      });

      logAligned("session", "session info", `Session ID: ${req.sessionID}`);

      logAligned("debug", "redirect info", `About to redirect to frontend...`);

      try {
        logAligned(
          "debug",
          "redirect attempt",
          `Calling res.redirect("${FRONTEND_URL}/recipes?auth=success")`
        );
        // Redirect user to the recipes page after successful OAuth
        res.redirect(
          `${FRONTEND_URL.replace(/\/+$/, "")}/recipes?auth=success`
        );
        return;
      } catch (error) {
        logAligned(
          "error",
          "redirect failed",
          `Redirect error: ${error.message}`
        );
        return res.status(500).send("Erreur de redirection");
      }
    });
  })(req, res, next);
});

app.get("/auth/logout", (req, res) => {
  const user = req.user;

  if (user) {
    logBox("user", "user logout", {
      User: user.name,
      ID: user.id.toString(),
      Email: user.email,
      Session: req.sessionID.substring(0, 6) + "...",
      Time: new Date().toLocaleString("fr-FR"),
      Action: "Logout",
    });
  } else {
    logAligned("warning", "logout attempt - no user session", {
      Session: req.sessionID.substring(0, 8) + "...",
      Time: new Date().toLocaleString("fr-FR"),
    });
  }

  req.logout((err) => {
    if (err) {
      logAligned("error", "logout error", `Error: ${err.message}`);
      return res.status(500).json({ error: "Erreur lors de la déconnexion" });
    }
    logAligned("success", "logout success", "Session destroyed successfully");

    const redirectUrl =
      process.env.NODE_ENV === "development" ? "http://localhost:5173" : "/";
    res.redirect(redirectUrl);
  });
});

// GET /api/user - Obtenir les informations de l'utilisateur connecté
app.get("/api/user", (req, res) => {
  if (process.env.SESSION_DEBUG === "true") {
    console.log("DEBUG /api/user:");
    console.log(`  - SessionID: ${req.sessionID || "NONE"}`);
    console.log(`  - Authenticated: ${req.isAuthenticated()}`);
    console.log(`  - User: ${req.user ? req.user.name : "NONE"}`);
    console.log(`  - Cookies: ${req.headers.cookie || "NONE"}`);
  }

  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatar_url: req.user.avatar_url,
    });
  } else {
    res.status(401).json({ error: "Non authentifié" });
  }
});

// Routes pour la bibliothèque de sous-recettes (privé)
app.use("/api/subrecipes", subrecipesRouter);

// Routes de partage de recettes

// POST /api/recipes/:id/share - Créer un lien de partage
app.post("/api/recipes/:id/share", ensureAuthenticated, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const shareToken = await ShareModel.createShare(recipeId, req.user.id);

    const shareUrl = `${req.protocol}://${req.get("host")}/share/${shareToken}`;

    logAligned("api", "share created", {
      User: req.user.name,
      Recipe: recipeId.toString(),
      Token: shareToken.substring(0, 8) + "...",
      URL: shareUrl,
    });

    res.json({
      shareToken,
      shareUrl,
      message: "Lien de partage créé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la création du partage:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/share/:token - Obtenir une recette partagée (public/non-fonctionnel)
app.get("/api/share/:token", async (req, res) => {
  try {
    const recipe = await ShareModel.getRecipeByShareToken(req.params.token);

    if (!recipe) {
      return res.status(404).json({ error: "Recette partagée non trouvée" });
    }

    logAligned("api", "shared recipe viewed", {
      Token: req.params.token.substring(0, 8) + "...",
      Recipe: recipe.name,
      Author: recipe.author_name || "Anonyme",
    });

    res.json(recipe);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la recette partagée:",
      error
    );

    // Gérer les erreurs de visibilité spécifiques
    if (error.code === "LINK_DISABLED") {
      return res.status(404).json({
        error: "Cette recette n'est plus accessible via le lien de partage",
      });
    }

    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de la recette" });
  }
});

// GET /share/:token/print - Page d'impression pour une recette partagée
app.get("/share/:token/print", async (req, res) => {
  try {
    const recipe = await ShareModel.getRecipeByShareToken(req.params.token);

    if (!recipe) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Recette non trouvée</title></head>
        <body>
          <h1>Recette non trouvée</h1>
          <p>Le lien de partage est invalide ou expiré.</p>
        </body>
        </html>
      `);
    }

    const html = await PDFService.generateRecipePDF(recipe);

    res.set({
      "Content-Type": "text/html; charset=utf-8",
    });

    logAligned("web", "recipe print page accessed", {
      Token: req.params.token.substring(0, 8) + "...",
      Recipe: recipe.name,
    });

    res.send(html);
  } catch (error) {
    console.error(
      "Erreur lors de la génération de la page d'impression:",
      error
    );

    // Gérer les erreurs de visibilité spécifiques
    if (error.code === "LINK_DISABLED") {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Recette non accessible</title></head>
        <body>
          <h1>Recette non accessible</h1>
          <p>Cette recette n'est plus accessible via le lien de partage.</p>
        </body>
        </html>
      `);
    }

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Erreur</title></head>
      <body>
        <h1>Erreur</h1>
        <p>Impossible de charger la page d'impression.</p>
      </body>
      </html>
    `);
  }
});

// GET /api/share/:token/pdf - Télécharger la recette en PDF
app.get("/api/share/:token/pdf", async (req, res) => {
  try {
    const recipe = await ShareModel.getRecipeByShareToken(req.params.token);

    if (!recipe) {
      return res.status(404).json({ error: "Recette partagée non trouvée" });
    }

    const pdfBuffer = await PDFService.generateRecipePDF(recipe);
    const filename = `${recipe.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    logAligned("api", "recipe pdf downloaded", {
      Token: req.params.token.substring(0, 8) + "...",
      Recipe: recipe.name,
      Filename: filename,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);

    // Gérer les erreurs de visibilité spécifiques
    if (error.code === "LINK_DISABLED") {
      return res.status(404).json({
        error: "Cette recette n'est plus accessible via le lien de partage",
      });
    }

    res.status(500).json({ error: "Erreur lors de la génération du PDF" });
  }
});

// POST /api/share/:token/add - Ajouter une recette partagée à sa collection
app.post("/api/share/:token/add", ensureAuthenticated, async (req, res) => {
  try {
    const newRecipe = await ShareModel.addSharedRecipeToUser(
      req.params.token,
      req.user.id
    );

    logAligned("api", "shared recipe added", {
      User: req.user.name,
      Token: req.params.token.substring(0, 8) + "...",
      Recipe: newRecipe.name,
      NewId: newRecipe.id.toString(),
    });

    res.json({
      recipe: newRecipe,
      message: "Recette ajoutée à votre collection avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de la recette:", error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/recipes/:id/shares - Obtenir les statistiques de partage
app.get("/api/recipes/:id/shares", ensureAuthenticated, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const shares = await ShareModel.getShareStats(recipeId, req.user.id);

    res.json(shares);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des stats de partage:",
      error
    );
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/share/:token - Désactiver un partage
app.delete("/api/share/:token", ensureAuthenticated, async (req, res) => {
  try {
    await ShareModel.deactivateShare(req.params.token, req.user.id);

    logAligned("api", "share deactivated", {
      User: req.user.name,
      Token: req.params.token.substring(0, 8) + "...",
    });

    res.json({ message: "Partage désactivé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la désactivation du partage:", error);
    res.status(500).json({ error: error.message });
  }
});

// Routes recettes

// DELETE /api/user/delete-all-data - Supprimer toutes les données de l'utilisateur
app.delete(
  "/api/user/delete-all-data",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userName = req.user.name;
      logAligned("warning", "user data deletion requested", {
        User: userName,
        ID: userId.toString(),
      });
      await UserModel.deleteAllUserData(userId);
      req.logout((err) => {
        if (err) console.error("Erreur lors de la déconnexion:", err);
        req.session.destroy();
      });
      logAligned("success", "user data deleted", {
        User: userName,
        ID: userId.toString(),
      });
      res.json({
        message: "Toutes vos données ont été supprimées avec succès",
      });
    } catch (error) {
      logAligned("error", "user data deletion error", {
        User: req.user.name,
        Error: error.message,
      });
      res
        .status(500)
        .json({ error: "Erreur lors de la suppression des données" });
    }
  }
);

// GET /api/recipes - Obtenir toutes les recettes de l'utilisateur
app.get("/api/recipes", ensureAuthenticated, async (req, res) => {
  try {
    const recipes = await RecipeModel.getAllByUserId(req.user.id);
    logAligned("api", "recipes fetched", {
      User: req.user.name,
      Count: recipes.length.toString(),
    });
    res.json(recipes);
  } catch (error) {
    logAligned("error", "recipe fetch error", {
      User: req.user.name,
      Error: error.message,
    });
    res.status(500).json({ error: "Erreur lors de la lecture des recettes" });
  }
});

// GET /api/recipes/:id/pdf - Télécharger le PDF d'une recette de l'utilisateur
app.get("/api/recipes/:id/pdf", ensureAuthenticated, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const recipe = await RecipeModel.getByIdAndUserId(recipeId, req.user.id);

    if (!recipe) {
      return res.status(404).json({ error: "Recette non trouvée" });
    }

    const pdfBuffer = await PDFService.generateRecipePDF(recipe);
    const filename = `${recipe.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    logAligned("api", "recipe pdf downloaded", {
      User: req.user.name,
      Recipe: recipe.name,
      Filename: filename,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    res.status(500).json({ error: "Erreur lors de la génération du PDF" });
  }
});

// GET /api/recipes/:id - Obtenir une recette par ID
app.get("/api/recipes/:id", ensureAuthenticated, async (req, res) => {
  try {
    const recipe = await RecipeModel.getByIdAndUserId(
      parseInt(req.params.id),
      req.user.id
    );

    if (!recipe) {
      return res.status(404).json({ error: "Recette non trouvée" });
    }

    res.json(recipe);
  } catch (error) {
    console.error("Erreur lors de la lecture de la recette:", error);
    res.status(500).json({ error: "Erreur lors de la lecture de la recette" });
  }
});

// POST /api/upload-image - Upload d'une image pour les recettes
app.post("/api/upload-image", (req, res) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ error: "Non authentifié" });
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("Erreur multer:", err);
      if (err.code === "ENOENT")
        return res.status(500).json({ error: "Dossier uploads non trouvé" });
      if (err.code === "EACCES")
        return res
          .status(500)
          .json({ error: "Permissions insuffisantes sur le dossier uploads" });
      if (err.code === "LIMIT_FILE_SIZE")
        return res
          .status(400)
          .json({ error: "Fichier trop volumineux (max 15MB)" });
      if (err.message.includes("images"))
        return res
          .status(400)
          .json({ error: "Seules les images sont autorisées" });
      return res.status(500).json({ error: `Erreur upload: ${err.message}` });
    }
    try {
      if (!req.file)
        return res.status(400).json({ error: "Aucune image fournie" });
      console.log("Image reçue:", req.file.filename);
      const originalPath = req.file.path;
      const webpFilename = await ImageService.optimizeImage(originalPath, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 85,
        deleteOriginal: true,
      });
      console.log("Image optimisée et convertie en WebP:", webpFilename);
      const imageUrl = `/uploads/${webpFilename}`;
      res.json({
        imageUrl,
        originalFilename: req.file.originalname,
        optimizedFilename: webpFilename,
        format: "webp",
      });
    } catch (error) {
      console.error("Erreur lors de l'upload de l'image:", error);
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error(
            "Erreur lors de la suppression du fichier temporaire:",
            unlinkError
          );
        }
      }
      res.status(500).json({ error: "Erreur lors de l'upload de l'image" });
    }
  });
});

// POST /api/upload-image-advanced - Upload avec génération de multiples tailles
app.post("/api/upload-image-advanced", (req, res) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ error: "Non authentifié" });
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("Erreur multer:", err);
      if (err.code === "LIMIT_FILE_SIZE")
        return res
          .status(400)
          .json({ error: "Fichier trop volumineux (max 15MB)" });
      if (err.message.includes("images"))
        return res
          .status(400)
          .json({ error: "Seules les images sont autorisées" });
      return res.status(500).json({ error: `Erreur upload: ${err.message}` });
    }
    try {
      if (!req.file)
        return res.status(400).json({ error: "Aucune image fournie" });
      console.log("Image reçue pour traitement avancé:", req.file.filename);
      const generatedFiles = await ImageService.generateMultipleSizes(
        req.file.path,
        { quality: 85, deleteOriginal: true }
      );
      console.log("Images générées:", generatedFiles);
      const imageUrls = {};
      for (const [size, filename] of Object.entries(generatedFiles))
        imageUrls[size] = `/uploads/${filename}`;
      res.json({
        imageUrls,
        originalFilename: req.file.originalname,
        generatedFiles,
        format: "webp",
      });
    } catch (error) {
      console.error("Erreur lors du traitement avancé de l'image:", error);
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error(
            "Erreur lors de la suppression du fichier temporaire:",
            unlinkError
          );
        }
      }
      res.status(500).json({ error: "Erreur lors du traitement de l'image" });
    }
  });
});

// Gestion des images de notes
const noteImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uuid = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `notes_${uuid}${extension}`);
  },
});
const uploadNoteImage = multer({
  storage: noteImageStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /api/recipes/:id/note-images - Upload d'une image pour les notes
app.post("/api/recipes/:id/note-images", ensureAuthenticated, (req, res) => {
  const recipeId = parseInt(req.params.id);
  uploadNoteImage.single("image")(req, res, async (err) => {
    if (err) {
      console.error("Erreur multer:", err);
      if (err.code === "LIMIT_FILE_SIZE")
        return res
          .status(400)
          .json({ error: "Fichier trop volumineux (max 15MB)" });
      if (err.message.includes("images"))
        return res
          .status(400)
          .json({ error: "Seules les images sont autorisées" });
      return res.status(500).json({ error: `Erreur upload: ${err.message}` });
    }
    try {
      if (!req.file)
        return res.status(400).json({ error: "Aucune image fournie" });
      const recipe = await RecipeModel.getByIdAndUserId(recipeId, req.user.id);
      if (!recipe) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Recette non trouvée" });
      }
      const existingImages = await RecipeModel.getNoteImages(recipeId);
      if (existingImages.length >= 10) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ error: "Limite de 10 images par recette atteinte" });
      }
      console.log("Image de note reçue pour traitement:", req.file.filename);
      const optimizedFilename = await ImageService.convertToWebP(
        req.file.path,
        { quality: 85, deleteOriginal: true }
      );
      const optimizedPath = path.join(
        __dirname,
        "../uploads/",
        optimizedFilename
      );
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(optimizedPath).metadata();
      const stats = fs.statSync(optimizedPath);
      const noteImageData = {
        recipe_id: recipeId,
        image_url: `/uploads/${optimizedFilename}`,
        original_filename: req.file.originalname,
        optimized_filename: optimizedFilename,
        file_size: stats.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
      const savedImage = await RecipeModel.addNoteImage(noteImageData);
      res.json({
        id: savedImage.id,
        imageUrl: `/uploads/${optimizedFilename}`,
        originalFilename: req.file.originalname,
        optimizedFilename: optimizedFilename,
        fileSize: stats.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      });
    } catch (error) {
      console.error("Erreur lors de l'upload de l'image de note:", error);
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error(
            "Erreur lors de la suppression du fichier temporaire:",
            unlinkError
          );
        }
      }
      res.status(500).json({ error: "Erreur lors de l'upload de l'image" });
    }
  });
});

// GET /api/recipes/:id/note-images - Récupérer les images des notes d'une recette
app.get(
  "/api/recipes/:id/note-images",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const recipe = await RecipeModel.getByIdAndUserId(recipeId, req.user.id);
      if (!recipe)
        return res.status(404).json({ error: "Recette non trouvée" });
      const images = await RecipeModel.getNoteImages(recipeId);
      res.json(images);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des images de notes:",
        error
      );
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération des images" });
    }
  }
);

// DELETE /api/recipes/:id/note-images/:imageId - Supprimer une image de note
app.delete(
  "/api/recipes/:id/note-images/:imageId",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const imageId = parseInt(req.params.imageId);
      const recipe = await RecipeModel.getByIdAndUserId(recipeId, req.user.id);
      if (!recipe)
        return res.status(404).json({ error: "Recette non trouvée" });
      const imageInfo = await RecipeModel.getNoteImageById(imageId);
      if (!imageInfo || imageInfo.recipe_id !== recipeId)
        return res.status(404).json({ error: "Image non trouvée" });
      const deleted = await RecipeModel.deleteNoteImage(imageId);
      if (!deleted) return res.status(404).json({ error: "Image non trouvée" });
      const imagePath = path.join(
        __dirname,
        "../uploads/",
        imageInfo.optimized_filename
      );
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log("Fichier image supprimé:", imageInfo.optimized_filename);
        } catch (error) {
          console.error("Erreur lors de la suppression du fichier:", error);
        }
      }
      res.json({ message: "Image supprimée avec succès" });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image de note:", error);
      res
        .status(500)
        .json({ error: "Erreur lors de la suppression de l'image" });
    }
  }
);

// GET /api/cleanup-images - Nettoyage des anciennes images
app.get("/api/cleanup-images", ensureAuthenticated, async (req, res) => {
  try {
    const maxAgeHours = parseInt(req.query.hours) || 24;
    await ImageService.cleanupOldImages(maxAgeHours);
    res.json({
      message: `Nettoyage effectué pour les images de plus de ${maxAgeHours}h`,
    });
  } catch (error) {
    console.error("Erreur lors du nettoyage:", error);
    res.status(500).json({ error: "Erreur lors du nettoyage des images" });
  }
});

// GET /api/image-info/:filename - Obtenir des infos sur une image
app.get("/api/image-info/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, "../uploads/", filename);
    if (!fs.existsSync(imagePath))
      return res.status(404).json({ error: "Image non trouvée" });
    const isValid = await ImageService.isValidImage(imagePath);
    if (!isValid) return res.status(400).json({ error: "Fichier non valide" });
    const stats = fs.statSync(imagePath);
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(imagePath).metadata();
    res.json({
      filename,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      created: stats.birthtime,
      modified: stats.mtime,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des infos image:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des informations" });
  }
});
app.post("/api/recipes", ensureAuthenticated, async (req, res) => {
  try {
    const newRecipe = await RecipeModel.create(req.body, req.user.id);
    res.status(201).json(newRecipe);
  } catch (error) {
    console.error("Erreur lors de la création de la recette:", error);

    if (error.code === "VALIDATION_ERROR") {
      return res.status(400).json({
        error: "Données de recette invalides",
        details: error.details,
      });
    }

    res.status(500).json({ error: "Erreur lors de la création de la recette" });
  }
});

// PUT /api/recipes/:id - Mettre à jour une recette
app.put("/api/recipes/:id", ensureAuthenticated, async (req, res) => {
  try {
    const updatedRecipe = await RecipeModel.update(
      parseInt(req.params.id),
      req.body,
      req.user.id
    );

    if (!updatedRecipe) {
      return res.status(404).json({ error: "Recette non trouvée" });
    }

    res.json(updatedRecipe);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la recette:", error);

    if (error.code === "VALIDATION_ERROR") {
      return res.status(400).json({
        error: "Données de recette invalides",
        details: error.details,
      });
    }

    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de la recette" });
  }
});

// DELETE /api/recipes/:id - Supprimer une recette
app.delete("/api/recipes/:id", ensureAuthenticated, async (req, res) => {
  try {
    const deleted = await RecipeModel.delete(
      parseInt(req.params.id),
      req.user.id
    );

    if (!deleted) {
      return res.status(404).json({ error: "Recette non trouvée" });
    }

    res.json({ message: "Recette supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la recette:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la suppression de la recette" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  logBox("success", "recipes server started", {
    Server: `${SERVER_URL}`,
    API: `${VITE_API_URL}`,
    OAuth: `${GOOGLE_CALLBACK_URL}`,
    Started: new Date().toLocaleString("fr-FR"),
    Environment: process.env.NODE_ENV || "development",
    Database: "MySQL",
    Session: "Active",
    Status: "Ready",
  });
});

app.get(/.*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  const url = req.path || "";
  if (
    url.startsWith("/api") ||
    url.startsWith("/auth") ||
    url.startsWith("/uploads") ||
    url.startsWith("/share")
  ) {
    return next();
  }

  const indexPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return next();
});

export default app;
