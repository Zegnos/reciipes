import connection from "../connection.js";

class SubRecipeModel {
  static async create(data, userId) {
    const conn = await connection.getConnection();
    try {
      const ingredientsJson = JSON.stringify(data.ingredients || []);
      const instructionsJson = JSON.stringify(data.instructions || []);

      const [result] = await conn.execute(
        `INSERT INTO subrecipes (user_id, name, description, image, ingredients, instructions) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          data.name,
          data.description || "",
          data.image || "",
          ingredientsJson,
          instructionsJson,
        ]
      );

      const id = result.insertId;
      return await this.getByIdAndUserId(id, userId);
    } finally {
      conn.release();
    }
  }

  static async getAllByUserId(userId) {
    const [rows] = await connection.execute(
      `SELECT id, user_id, name, description, image, ingredients, instructions, created_at, updated_at FROM subrecipes WHERE user_id = ? ORDER BY name`,
      [userId]
    );

    return rows.map((r) => ({
      ...r,
      ingredients:
        typeof r.ingredients === "string"
          ? JSON.parse(r.ingredients)
          : r.ingredients,
      instructions:
        typeof r.instructions === "string"
          ? JSON.parse(r.instructions)
          : r.instructions,
    }));
  }

  static async getByIdAndUserId(id, userId) {
    const [rows] = await connection.execute(
      `SELECT id, user_id, name, description, image, ingredients, instructions, created_at, updated_at FROM subrecipes WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      ingredients:
        typeof r.ingredients === "string"
          ? JSON.parse(r.ingredients)
          : r.ingredients,
      instructions:
        typeof r.instructions === "string"
          ? JSON.parse(r.instructions)
          : r.instructions,
    };
  }

  static async update(id, data, userId) {
    const conn = await connection.getConnection();
    try {

      const [exists] = await conn.execute(
        "SELECT id FROM subrecipes WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      if (exists.length === 0)
        throw new Error("Sous-recette non trouvée ou non autorisée");

      const ingredientsJson = JSON.stringify(data.ingredients || []);
      const instructionsJson = JSON.stringify(data.instructions || []);

      await conn.execute(
        `UPDATE subrecipes SET name = ?, description = ?, image = ?, ingredients = ?, instructions = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
        [
          data.name,
          data.description || "",
          data.image || "",
          ingredientsJson,
          instructionsJson,
          id,
          userId,
        ]
      );

      return await this.getByIdAndUserId(id, userId);
    } finally {
      conn.release();
    }
  }

  static async delete(id, userId) {
    const conn = await connection.getConnection();
    try {
      const [result] = await conn.execute(
        "DELETE FROM subrecipes WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }
}

export default SubRecipeModel;
