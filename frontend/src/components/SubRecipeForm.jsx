import React, { useState, useEffect } from "react";
import { recipeService } from "../services/recipeService";

const SubRecipeForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(
    initial || {
      name: "",
      description: "",
      image: "",
      ingredients: [{ name: "", quantity: "", unit: "" }],
      instructions: [""],
    }
  );

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleIngredientChange = (i, key, val) => {
    const copy = [...form.ingredients];
    copy[i] = { ...copy[i], [key]: val };
    setForm((f) => ({ ...f, ingredients: copy }));
  };

  const addIngredient = () =>
    setForm((f) => ({
      ...f,
      ingredients: [...f.ingredients, { name: "", quantity: "", unit: "" }],
    }));
  const removeIngredient = (i) =>
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, idx) => idx !== i),
    }));

  const handleInstructionChange = (i, val) => {
    const copy = [...form.instructions];
    copy[i] = val;
    setForm((f) => ({ ...f, instructions: copy }));
  };

  const addInstruction = () =>
    setForm((f) => ({ ...f, instructions: [...f.instructions, ""] }));
  const removeInstruction = (i) =>
    setForm((f) => ({
      ...f,
      instructions: f.instructions.filter((_, idx) => idx !== i),
    }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await recipeService.uploadImage(file);

      setForm((f) => ({
        ...f,
        image: data.imageUrl || data.optimizedFilename || data.filename || "",
      }));
    } catch (err) {
      console.error("Upload image sous-recette:", err);
      alert("Erreur upload image");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      ingredients: form.ingredients.filter(
        (ing) => ing.name && ing.name.trim()
      ),
      instructions: form.instructions.filter((s) => s && s.trim()),
    };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="subrecipe-form">
      <div className="form-group">
        <label>Nom</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Image</label>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {form.image && (
          <div style={{ marginTop: 12 }}>
            <img
              src={form.image}
              alt="Aperçu"
              className="subrecipe-preview-image"
            />
          </div>
        )}
      </div>

      <h4>Ingrédients</h4>
      {form.ingredients.map((ing, i) => (
        <div key={i} className="ingredient-row">
          <input
            type="text"
            placeholder="Nom de l'ingrédient"
            value={ing.name}
            onChange={(e) => handleIngredientChange(i, "name", e.target.value)}
          />
          <input
            type="number"
            placeholder="Quantité"
            value={ing.quantity}
            onChange={(e) =>
              handleIngredientChange(i, "quantity", e.target.value)
            }
            step="0.1"
          />
          <input
            type="text"
            placeholder="Unité"
            value={ing.unit}
            onChange={(e) => handleIngredientChange(i, "unit", e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeIngredient(i)}
            className="btn btn-danger btn-small"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addIngredient}
        className="btn btn-secondary"
      >
        + Ajouter un ingrédient
      </button>

      <h4>Instructions</h4>
      {form.instructions.map((s, i) => (
        <div key={i} className="step-row">
          <span className="step-number">{i + 1}</span>
          <div className="step-input-container">
            <textarea
              value={s}
              onChange={(e) => handleInstructionChange(i, e.target.value)}
              rows={3}
              placeholder="Décrivez cette étape..."
            />
          </div>
          <button
            type="button"
            onClick={() => removeInstruction(i)}
            className="btn btn-danger btn-small"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addInstruction}
        className="btn btn-secondary"
      >
        + Ajouter une étape
      </button>

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <button type="submit" className="btn btn-primary">
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Annuler
        </button>
      </div>
    </form>
  );
};

export default SubRecipeForm;
