import connection from "../connection.js";

class RecipeModel {
  static validateRecipeData(recipeData) {
    const errors = [];
    if (!recipeData.name || recipeData.name.trim() === "") {
      errors.push("Le nom de la recette est obligatoire");
    }
    if (
      !recipeData.prepTime ||
      isNaN(recipeData.prepTime) ||
      recipeData.prepTime <= -1
    ) {
      errors.push("Le temps de préparation doit être un nombre positif");
    }
    if (
      recipeData.cookingTime === undefined ||
      recipeData.cookingTime === null ||
      recipeData.cookingTime === "" ||
      isNaN(recipeData.cookingTime) ||
      recipeData.cookingTime < 0
    ) {
      errors.push("Le temps de cuisson doit être un nombre positif ou nul");
    }
    if (
      recipeData.restTime !== undefined &&
      recipeData.restTime !== null &&
      recipeData.restTime !== ""
    ) {
      if (isNaN(recipeData.restTime) || recipeData.restTime < 0) {
        errors.push("Le temps de repos doit être un nombre positif ou nul");
      }
    }
    if (
      recipeData.chillTime !== undefined &&
      recipeData.chillTime !== null &&
      recipeData.chillTime !== ""
    ) {
      if (isNaN(recipeData.chillTime) || recipeData.chillTime < 0) {
        errors.push(
          "Le temps de réfrigération doit être un nombre positif ou nul"
        );
      }
    }
    if (
      recipeData.freezeTime !== undefined &&
      recipeData.freezeTime !== null &&
      recipeData.freezeTime !== ""
    ) {
      if (isNaN(recipeData.freezeTime) || recipeData.freezeTime < 0) {
        errors.push(
          "Le temps de congélation doit être un nombre positif ou nul"
        );
      }
    }
    if (
      !recipeData.servings ||
      isNaN(recipeData.servings) ||
      recipeData.servings <= 0
    ) {
      errors.push("La quantité doit être un nombre positif");
    }
    if (!recipeData.category || recipeData.category.trim() === "") {
      errors.push("La catégorie est obligatoire");
    }
    if (!recipeData.type || recipeData.type.trim() === "") {
      errors.push("Le type de recette est obligatoire");
    }
    if (
      !recipeData.ingredients ||
      !Array.isArray(recipeData.ingredients) ||
      recipeData.ingredients.length === 0
    ) {
      errors.push("Au moins un ingrédient est requis");
    } else {
      let validIngredients = 0;
      recipeData.ingredients.forEach((ingredient, index) => {
        if (!ingredient.name || ingredient.name.trim() === "") {
          errors.push(`L'ingrédient ${index + 1} doit avoir un nom`);
        } else if (
          ingredient.quantity === null ||
          ingredient.quantity === undefined ||
          ingredient.quantity === "" ||
          isNaN(parseFloat(ingredient.quantity)) ||
          parseFloat(ingredient.quantity) <= 0
        ) {
          errors.push(
            `L'ingrédient "${ingredient.name}" doit avoir une quantité valide`
          );
        } else {
          validIngredients++;
        }
      });
      if (validIngredients === 0) {
        errors.push(
          "Au moins un ingrédient valide (nom et quantité) est requis"
        );
      }
    }
    if (
      !recipeData.instructions ||
      !Array.isArray(recipeData.instructions) ||
      recipeData.instructions.length === 0
    ) {
      errors.push("Au moins une étape de préparation est requise");
    } else {
      let validInstructions = 0;
      recipeData.instructions.forEach((instruction, index) => {
        if (!instruction || instruction.trim() === "") {
          errors.push(`L'étape ${index + 1} ne peut pas être vide`);
        } else {
          validInstructions++;
        }
      });
      if (validInstructions === 0) {
        errors.push("Au moins une étape de préparation valide est requise");
      }
    }
    return { isValid: errors.length === 0, errors: errors };
  }

  static async getAllByUserId(userId) {
    const sql = `
      SELECT 
        r.*,
        GROUP_CONCAT(DISTINCT CONCAT(
          '{"name":"', i.name, '","quantity":', ri.quantity, ',"unit":"', u.abbreviation, '"}'
        )) as ingredients_json,
        GROUP_CONCAT(DISTINCT CONCAT(
            '{"step_number":', rs.step_number, ',"instruction":"', rs.instruction, '","subrecipe_id":', IFNULL(rs.subrecipe_id, 'null'), '}'
        ) ORDER BY rs.step_number) as steps_json,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      LEFT JOIN units u ON ri.unit_id = u.id
      LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.user_id = ?
      GROUP BY r.id
      ORDER BY r.id
    `;
    const [results] = await connection.execute(sql, [userId]);
    return results.map(this.formatRecipe);
  }

  static async getByIdAndUserId(id, userId) {
    const sql = `
      SELECT 
        r.*,
        GROUP_CONCAT(DISTINCT CONCAT(
          '{"name":"', i.name, '","quantity":', ri.quantity, ',"unit":"', u.abbreviation, '"}'
        )) as ingredients_json,
        GROUP_CONCAT(DISTINCT CONCAT(
            '{"step_number":', rs.step_number, ',"instruction":"', rs.instruction, '","subrecipe_id":', IFNULL(rs.subrecipe_id, 'null'), '}'
        ) ORDER BY rs.step_number) as steps_json,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      LEFT JOIN units u ON ri.unit_id = u.id
      LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.id = ? AND r.user_id = ?
      GROUP BY r.id
    `;
    const [results] = await connection.execute(sql, [id, userId]);
    return results.length > 0 ? this.formatRecipe(results[0]) : null;
  }

  static async create(recipeData, userId) {
    const validation = this.validateRecipeData(recipeData);
    if (!validation.isValid) {
      const error = new Error("Données de recette invalides");
      error.code = "VALIDATION_ERROR";
      error.details = validation.errors;
      throw error;
    }
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();
      const [recipeResult] = await conn.execute(
        `
        INSERT INTO recipes (name, description, image, category, type, 
                           cooking_time, prep_time, rest_time, chill_time, freeze_time, 
                           servings, base_value, base_unit, rating, visibility, notes, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          recipeData.name,
          recipeData.description || "",
          recipeData.image || "",
          recipeData.category,
          recipeData.type,
          recipeData.cookingTime,
          recipeData.prepTime,
          recipeData.restTime || 0,
          recipeData.chillTime || 0,
          recipeData.freezeTime || 0,
          recipeData.servings,
          recipeData.baseValue || recipeData.servings,
          recipeData.baseUnit ||
            (recipeData.servings === 1 ? "personne" : "personnes"),
          recipeData.rating || 0,
          recipeData.visibility || "private",
          recipeData.notes || "",
          userId,
        ]
      );
      const recipeId = recipeResult.insertId;
      await this.addIngredientsStepsTags(conn, recipeId, recipeData);
      await conn.commit();
      return await this.getByIdAndUserId(recipeId, userId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(id, recipeData, userId) {
    const validation = this.validateRecipeData(recipeData);
    if (!validation.isValid) {
      const error = new Error("Données de recette invalides");
      error.code = "VALIDATION_ERROR";
      error.details = validation.errors;
      throw error;
    }
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();
      const [existingRecipe] = await conn.execute(
        "SELECT id FROM recipes WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      if (existingRecipe.length === 0)
        throw new Error("Recette non trouvée ou non autorisée");
      await conn.execute(
        `UPDATE recipes SET 
         name = ?, description = ?, image = ?, category = ?, type = ?, 
         cooking_time = ?, prep_time = ?, rest_time = ?, chill_time = ?, freeze_time = ?,
         servings = ?, base_value = ?, base_unit = ?, rating = ?, visibility = ?, notes = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [
          recipeData.name,
          recipeData.description || "",
          recipeData.image || "",
          recipeData.category,
          recipeData.type,
          recipeData.cookingTime,
          recipeData.prepTime,
          recipeData.restTime || 0,
          recipeData.chillTime || 0,
          recipeData.freezeTime || 0,
          recipeData.servings,
          recipeData.baseValue || recipeData.servings,
          recipeData.baseUnit ||
            (recipeData.servings === 1 ? "personne" : "personnes"),
          recipeData.rating || 5,
          recipeData.visibility || "private",
          recipeData.notes || "",
          id,
          userId,
        ]
      );
      await conn.execute("DELETE FROM recipe_ingredients WHERE recipe_id = ?", [
        id,
      ]);
      await conn.execute("DELETE FROM recipe_steps WHERE recipe_id = ?", [id]);
      await conn.execute("DELETE FROM recipe_tags WHERE recipe_id = ?", [id]);
      await this.addIngredientsStepsTags(conn, id, recipeData);
      await conn.commit();
      return await this.getByIdAndUserId(id, userId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async delete(id, userId) {
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();
      const noteImages = await this.getNoteImages(id);
      await this.deleteAllNoteImages(id);
      const [result] = await conn.execute(
        "DELETE FROM recipes WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      await conn.commit();
      if (result.affectedRows > 0) {
        const fs = await import("fs");
        const path = await import("path");
        for (const image of noteImages) {
          const imagePath = path.default.join(
            process.cwd(),
            "uploads",
            image.optimized_filename
          );
          if (fs.default.existsSync(imagePath)) {
            try {
              fs.default.unlinkSync(imagePath);
              console.log("Image de note supprimée:", image.optimized_filename);
            } catch (error) {
              console.error("Erreur lors de la suppression du fichier:", error);
            }
          }
        }
      }
      return result.affectedRows > 0;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async addIngredientsStepsTags(conn, recipeId, recipeData) {
    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
      for (const ingredient of recipeData.ingredients) {
        if (!ingredient.name || ingredient.name.trim() === "") {
          console.warn("Ingrédient ignoré: nom vide ou invalide", ingredient);
          continue;
        }
        let [ingredientResult] = await conn.execute(
          "SELECT id FROM ingredients WHERE name = ?",
          [ingredient.name]
        );
        let ingredientId;
        if (ingredientResult.length === 0) {
          const [insertResult] = await conn.execute(
            "INSERT INTO ingredients (name) VALUES (?)",
            [ingredient.name]
          );
          ingredientId = insertResult.insertId;
        } else {
          ingredientId = ingredientResult[0].id;
        }
        const unitName =
          ingredient.unit && ingredient.unit.trim() !== ""
            ? ingredient.unit
            : "";
        let [unitResult] = await conn.execute(
          "SELECT id FROM units WHERE abbreviation = ?",
          [unitName]
        );
        let unitId;
        if (unitResult.length === 0) {
          const [insertResult] = await conn.execute(
            "INSERT INTO units (name, abbreviation) VALUES (?, ?)",
            [unitName, unitName]
          );
          unitId = insertResult.insertId;
        } else {
          unitId = unitResult[0].id;
        }
        let quantity = ingredient.quantity;
        if (
          quantity === null ||
          quantity === undefined ||
          quantity === "" ||
          isNaN(parseFloat(quantity))
        ) {
          quantity = 1;
          console.warn(
            `Quantité invalide pour l'ingrédient "${ingredient.name}", utilisation de la valeur par défaut: 1`
          );
        } else {
          quantity = parseFloat(quantity);
        }
        await conn.execute(
          "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id) VALUES (?, ?, ?, ?)",
          [recipeId, ingredientId, quantity, unitId]
        );
      }
    }
    if (recipeData.instructions && recipeData.instructions.length > 0) {
      for (let i = 0; i < recipeData.instructions.length; i++) {
        const cleanInstruction = recipeData.instructions[i]
          .replace(/[\r\n\t]+/g, " ")
          .trim();
        const subrecipeId =
          recipeData.stepSubrecipes && recipeData.stepSubrecipes[i]
            ? recipeData.stepSubrecipes[i]
            : null;
        if (subrecipeId) {
          await conn.execute(
            "INSERT INTO recipe_steps (recipe_id, step_number, instruction, subrecipe_id) VALUES (?, ?, ?, ?)",
            [recipeId, i + 1, cleanInstruction, subrecipeId]
          );
        } else {
          await conn.execute(
            "INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES (?, ?, ?)",
            [recipeId, i + 1, cleanInstruction]
          );
        }
      }
    }
    if (recipeData.tags && recipeData.tags.length > 0) {
      for (const tagName of recipeData.tags) {
        let [tagResult] = await conn.execute(
          "SELECT id FROM tags WHERE name = ?",
          [tagName]
        );
        let tagId;
        if (tagResult.length === 0) {
          const [insertResult] = await conn.execute(
            "INSERT INTO tags (name) VALUES (?)",
            [tagName]
          );
          tagId = insertResult.insertId;
        } else {
          tagId = tagResult[0].id;
        }
        await conn.execute(
          "INSERT IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
          [recipeId, tagId]
        );
      }
    }
  }

  static formatRecipe(row) {
    const recipe = {
      id: row.id,
      name: row.name,
      description: row.description,
      image: row.image,
      category: row.category,
      type: row.type,
      cookingTime: row.cooking_time,
      prepTime: row.prep_time,
      restTime: row.rest_time || 0,
      chillTime: row.chill_time || 0,
      freezeTime: row.freeze_time || 0,
      totalTime: row.total_time,
      servings: row.servings,
      baseValue: row.base_value || row.servings,
      baseUnit:
        row.base_unit || (row.servings === 1 ? "personne" : "personnes"),
      rating: row.rating,
      notes: row.notes,
      user_id: row.user_id,
      ingredients: [],
      instructions: [],
      tags: [],
    };
    if (row.ingredients_json) {
      try {
        if (row.ingredients_json.startsWith("{")) {
          const jsonStrings = [];
          let braceCount = 0;
          let currentJson = "";
          for (let i = 0; i < row.ingredients_json.length; i++) {
            const char = row.ingredients_json[i];
            currentJson += char;
            if (char === "{") braceCount++;
            if (char === "}") braceCount--;
            if (braceCount === 0 && currentJson.trim()) {
              jsonStrings.push(currentJson.trim());
              currentJson = "";
              if (
                i + 1 < row.ingredients_json.length &&
                row.ingredients_json[i + 1] === ","
              ) {
                i++;
              }
            }
          }
          recipe.ingredients = jsonStrings.map((jsonStr) =>
            JSON.parse(jsonStr)
          );
        } else {
          recipe.ingredients = JSON.parse(row.ingredients_json);
        }
      } catch (e) {
        console.error("Erreur parsing ingredients:", e);
        console.error("Data:", row.ingredients_json);
        recipe.ingredients = [];
      }
    }
    if (row.steps_json) {
      try {
        if (row.steps_json.startsWith("{")) {
          const jsonStrings = [];
          let braceCount = 0;
          let currentJson = "";
          for (let i = 0; i < row.steps_json.length; i++) {
            const char = row.steps_json[i];
            currentJson += char;
            if (char === "{") braceCount++;
            if (char === "}") braceCount--;
            if (braceCount === 0 && currentJson.trim()) {
              jsonStrings.push(currentJson.trim());
              currentJson = "";
              if (
                i + 1 < row.steps_json.length &&
                row.steps_json[i + 1] === ","
              ) {
                i++;
              }
            }
          }
          const steps = jsonStrings.map((jsonStr) => {
            const cleanedJsonStr = jsonStr.replace(/[\r\n\t]/g, " ").trim();
            return JSON.parse(cleanedJsonStr);
          });
          steps.sort((a, b) => a.step_number - b.step_number);
          recipe.instructions = steps.map((step) => step.instruction);
          recipe.stepSubrecipes = steps.map((step) =>
            step.subrecipe_id ? step.subrecipe_id : null
          );
        } else {
          const cleanedStepsJson = row.steps_json.replace(/[\r\n\t]/g, " ");
          const steps = JSON.parse(cleanedStepsJson);
          steps.sort((a, b) => a.step_number - b.step_number);
          recipe.instructions = steps.map((step) => step.instruction);
        }
      } catch (e) {
        console.error("Erreur parsing steps:", e);
        console.error("Data:", row.steps_json);
        recipe.instructions = [];
      }
    }
    if (row.tags) {
      recipe.tags = row.tags.split(",").filter((tag) => tag.trim());
    }
    return recipe;
  }

  static async addNoteImage(imageData) {
    const sql = `
      INSERT INTO recipe_note_images 
      (recipe_id, image_url, original_filename, optimized_filename, file_size, width, height, format)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute(sql, [
      imageData.recipe_id,
      imageData.image_url,
      imageData.original_filename,
      imageData.optimized_filename,
      imageData.file_size,
      imageData.width,
      imageData.height,
      imageData.format,
    ]);
    return { id: result.insertId, ...imageData };
  }

  static async getNoteImages(recipeId) {
    const sql = `
      SELECT id, recipe_id, image_url, original_filename, optimized_filename, 
             file_size, width, height, format, created_at
      FROM recipe_note_images 
      WHERE recipe_id = ? 
      ORDER BY created_at ASC
    `;
    const [results] = await connection.execute(sql, [recipeId]);
    return results;
  }

  static async getNoteImageById(imageId) {
    const sql = `
      SELECT id, recipe_id, image_url, original_filename, optimized_filename, 
             file_size, width, height, format, created_at
      FROM recipe_note_images 
      WHERE id = ?
    `;
    const [results] = await connection.execute(sql, [imageId]);
    return results.length > 0 ? results[0] : null;
  }

  static async deleteNoteImage(imageId) {
    const sql = `DELETE FROM recipe_note_images WHERE id = ?`;
    const [result] = await connection.execute(sql, [imageId]);
    return result.affectedRows > 0;
  }

  static async deleteAllNoteImages(recipeId) {
    const sql = `DELETE FROM recipe_note_images WHERE recipe_id = ?`;
    const [result] = await connection.execute(sql, [recipeId]);
    return result.affectedRows;
  }

  static async countNoteImages(recipeId) {
    const sql = `SELECT COUNT(*) as count FROM recipe_note_images WHERE recipe_id = ?`;
    const [results] = await connection.execute(sql, [recipeId]);
    return results[0].count;
  }
}

export default RecipeModel;
