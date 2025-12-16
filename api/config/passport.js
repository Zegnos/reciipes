import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserModel from "../database/models/UserModel.js";

dotenv.config();

const missingGoogleConfig = [];
if (!process.env.GOOGLE_CLIENT_ID) missingGoogleConfig.push("GOOGLE_CLIENT_ID");
if (!process.env.GOOGLE_CLIENT_SECRET)
  missingGoogleConfig.push("GOOGLE_CLIENT_SECRET");

if (missingGoogleConfig.length > 0) {
  throw new Error(
    `Configuration Google OAuth manquante: ${missingGoogleConfig.join(", ")}`
  );
}

const DEFAULT_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://reciipes.fr"
    : "http://localhost:2029";

const getServerBaseUrl = () => {
  const candidates = [
    process.env.SERVER_URL,
    process.env.API_BASE_URL,
    process.env.API_URL,
    process.env.BACKEND_URL,
    process.env.NODE_ENV === "production" ? process.env.PROD_URL : null,
  ].filter((value) => !!value);

  const chosen = candidates[0] || DEFAULT_BASE_URL;
  return chosen.replace(/\/+$/, "");
};

const absolutizeCallback = (value) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = getServerBaseUrl();
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${normalizedPath}`;
};

const resolveCallbackURL = () => {
  const configured = absolutizeCallback(process.env.GOOGLE_CALLBACK_URL);
  if (configured) return configured;
  return `${getServerBaseUrl()}/auth/google/callback`;
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: resolveCallbackURL(),
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Vérifier si l'utilisateur existe déjà
        let user = await UserModel.findByGoogleId(profile.id);

        if (user) {
          // Mettre à jour les informations de l'utilisateur
          const updatedData = {
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar_url: profile.photos[0].value,
          };
          await UserModel.updateUser(user.id, updatedData);
          user = { ...user, ...updatedData };
        } else {
          // Créer un nouvel utilisateur
          const newUserData = {
            google_id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar_url: profile.photos[0].value,
          };
          user = await UserModel.createUser(newUserData);
        }

        return done(null, user);
      } catch (error) {
        console.error("OAuth error:", error.message);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    console.error("Deserialization error:", error.message);
    done(error, null);
  }
});

export default passport;
