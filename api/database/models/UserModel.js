import { connection as db } from "../connection.js";

class UserModel {
  static async createUser(userData) {
    try {
      const [result] = await db.query(
        "INSERT INTO reciipe_user (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)",
        [userData.google_id, userData.email, userData.name, userData.avatar_url]
      );

      const newUser = {
        id: result.insertId,
        ...userData,
        created_at: new Date(),
        updated_at: new Date(),
      };
      return newUser;
    } catch (error) {
      console.error("UserModel.createUser error:", error.message);
      throw error;
    }
  }

  static async findByGoogleId(googleId) {
    try {
      const [rows] = await db.query(
        "SELECT * FROM reciipe_user WHERE google_id = ?",
        [googleId]
      );
      const user = rows[0] || null;
      return user;
    } catch (error) {
      console.error("UserModel.findByGoogleId error:", error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.query("SELECT * FROM reciipe_user WHERE id = ?", [
        id,
      ]);
      const user = rows[0] || null;
      return user;
    } catch (error) {
      console.error("UserModel.findById error:", error.message);
      throw error;
    }
  }

  static async updateUser(id, userData) {
    try {
      const [result] = await db.query(
        "UPDATE reciipe_user SET email = ?, name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?",
        [userData.email, userData.name, userData.avatar_url, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("UserModel.updateUser error:", error.message);
      throw error;
    }
  }

  static async deleteAllUserData(userId) {
    try {
      // Supprimer toutes les recettes de l'utilisateur (cela supprimera aussi les shares et images via CASCADE)
      await db.query("DELETE FROM recipes WHERE user_id = ?", [userId]);

      // Supprimer l'utilisateur
      await db.query("DELETE FROM reciipe_user WHERE id = ?", [userId]);

      return true;
    } catch (error) {
      console.error("UserModel.deleteAllUserData error:", error.message);
      throw error;
    }
  }
}

export default UserModel;
