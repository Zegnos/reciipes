import connection from "../connection.js";
import { v4 as uuidv4 } from "uuid";
import RecipeModel from "./RecipeModel.js";

class ShareModel {
  static async createShare(recipeId, userId) {
    const conn = await connection.getConnection();
    try {
      const recipe = await RecipeModel.getByIdAndUserId(recipeId, userId);
      if (!recipe) throw new Error("Recette non trouvée ou non autorisée");
      const [existingShares] = await conn.execute(
        "SELECT share_token FROM recipe_shares WHERE recipe_id = ? AND is_active = TRUE",
        [recipeId]
      );
      if (existingShares.length > 0) return existingShares[0].share_token;
      const shareToken = uuidv4();
      await conn.execute(
        "INSERT INTO recipe_shares (recipe_id, share_token) VALUES (?, ?)",
        [recipeId, shareToken]
      );
      return shareToken;
    } finally {
      conn.release();
    }
  }

  static async getRecipeByShareToken(shareToken) {
    const conn = await connection.getConnection();
    try {
      const [shareResult] = await conn.execute(
        "SELECT recipe_id FROM recipe_shares WHERE share_token = ? AND is_active = TRUE",
        [shareToken]
      );
      if (shareResult.length === 0) return null;
      const recipeId = shareResult[0].recipe_id;
      const [visibilityCheck] = await conn.execute(
        "SELECT visibility FROM recipes WHERE id = ?",
        [recipeId]
      );
      if (visibilityCheck.length === 0) return null;
      const visibility = visibilityCheck[0].visibility;
      if (visibility === "link_only") {
        const error = new Error("Recipe not accessible via shared link");
        error.code = "LINK_DISABLED";
        error.status = 404;
        throw error;
      }
      await conn.execute(
        "UPDATE recipe_shares SET view_count = view_count + 1 WHERE share_token = ?",
        [shareToken]
      );
      const sql = `
        SELECT 
          r.*,
          u.name as author_name,
          GROUP_CONCAT(DISTINCT CONCAT(
            '{"name":"', i.name, '","quantity":', ri.quantity, ',"unit":"', un.abbreviation, '"}'
          )) as ingredients_json,
          GROUP_CONCAT(DISTINCT CONCAT(
            '{"step_number":', rs.step_number, ',"instruction":"', rs.instruction, '"}'
          ) ORDER BY rs.step_number) as steps_json,
          GROUP_CONCAT(DISTINCT t.name) as tags
        FROM recipes r
        JOIN reciipe_user u ON r.user_id = u.id
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        LEFT JOIN units un ON ri.unit_id = un.id
        LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id
        LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        WHERE r.id = ?
        GROUP BY r.id
      `;
      const [results] = await conn.execute(sql, [recipeId]);
      if (results.length === 0) return null;
      return RecipeModel.formatRecipe(results[0]);
    } finally {
      conn.release();
    }
  }

  static async getShareStats(recipeId, userId) {
    const conn = await connection.getConnection();
    try {
      const recipe = await RecipeModel.getByIdAndUserId(recipeId, userId);
      if (!recipe) throw new Error("Recette non trouvée ou non autorisée");
      const [results] = await conn.execute(
        `SELECT 
           share_token, 
           view_count, 
           created_at,
           is_active
         FROM recipe_shares 
         WHERE recipe_id = ?`,
        [recipeId]
      );
      return results;
    } finally {
      conn.release();
    }
  }

  static async deactivateShare(shareToken, userId) {
    const conn = await connection.getConnection();
    try {
      const [shareResult] = await conn.execute(
        `SELECT rs.recipe_id 
         FROM recipe_shares rs
         JOIN recipes r ON rs.recipe_id = r.id
         WHERE rs.share_token = ? AND r.user_id = ?`,
        [shareToken, userId]
      );
      if (shareResult.length === 0)
        throw new Error("Partage non trouvé ou non autorisé");
      await conn.execute(
        "UPDATE recipe_shares SET is_active = FALSE WHERE share_token = ?",
        [shareToken]
      );
      return true;
    } finally {
      conn.release();
    }
  }

  static async addSharedRecipeToUser(shareToken, userId) {
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();
      const sharedRecipe = await this.getRecipeByShareToken(shareToken);
      if (!sharedRecipe) throw new Error("Recette partagée non trouvée");
      const existingRecipe = await RecipeModel.getByIdAndUserId(
        sharedRecipe.id,
        userId
      );
      if (existingRecipe)
        throw new Error("Vous avez déjà cette recette dans votre collection");
      const newRecipeData = {
        ...sharedRecipe,
        name: `${sharedRecipe.name} (partagée)`,
        notes: `Recette ajoutée depuis un partage.\nRecette originale de : ${
          sharedRecipe.author_name || "Utilisateur anonyme"
        }`,
      };
      delete newRecipeData.id;
      delete newRecipeData.user_id;
      delete newRecipeData.author_name;
      const newRecipe = await RecipeModel.create(newRecipeData, userId);
      await conn.commit();
      return newRecipe;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

export default ShareModel;
