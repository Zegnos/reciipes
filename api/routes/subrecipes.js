import express from "express";
import SubRecipeModel from "../database/models/SubRecipeModel.js";
import { ensureAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// GET /api/subrecipes - lister les sous-recettes de l'utilisateur
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const list = await SubRecipeModel.getAllByUserId(req.user.id);
    res.json(list);
  } catch (error) {
    console.error("Erreur GET /api/subrecipes:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subrecipes - créer
router.post("/", ensureAuthenticated, async (req, res) => {
  try {
    const data = req.body;
    if (!data.name) return res.status(400).json({ error: "Le nom est requis" });
    const created = await SubRecipeModel.create(data, req.user.id);
    res.status(201).json(created);
  } catch (error) {
    console.error("Erreur POST /api/subrecipes:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subrecipes/:id
router.get("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = await SubRecipeModel.getByIdAndUserId(id, req.user.id);
    if (!item) return res.status(404).json({ error: "Non trouvé" });
    res.json(item);
  } catch (error) {
    console.error("Erreur GET /api/subrecipes/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/subrecipes/:id
router.put("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await SubRecipeModel.update(id, req.body, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error("Erreur PUT /api/subrecipes/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/subrecipes/:id
router.delete("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await SubRecipeModel.delete(id, req.user.id);
    if (!ok)
      return res.status(404).json({ error: "Non trouvé ou non autorisé" });
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/subrecipes/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
