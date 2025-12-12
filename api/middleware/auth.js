// Middleware pour vérifier si l'utilisateur est authentifié
export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  console.log("Accès refusé - Non authentifié pour:", req.path);
  res.status(401).json({ error: "Non authentifié" });
};

// Middleware pour ajouter les informations utilisateur aux requêtes
export const addUserInfo = (req, res, next) => {
  if (req.user) {
    req.userId = req.user.id;
  }
  next();
};