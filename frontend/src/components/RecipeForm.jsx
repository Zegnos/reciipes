import React, { useState, useEffect } from "react";
import { RECIPE_FILTERS, recipeService } from "../services/recipeService";
import ImageCropper from "./ImageCropper";
import NoteImageUploader from "./NoteImageUploader";
import NoteImageThumbnails from "./NoteImageThumbnails";
import ImageGallery from "./ImageGallery";

const RecipeForm = ({
  recipe,
  onSave,
  onCancel,
  onAfterSave,
  showNotification,
  }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    category: "plat",
    type: "salé",
    cookingTime: 30,
    prepTime: 15,
    restTime: 0,
    chillTime: 0,
    freezeTime: 0,
    servings: 4,
    baseValue: 4,
    baseUnit: "personnes",
    rating: 5,
    visibility: "private",
    notes: "",
    ingredients: [{ name: "", quantity: "", unit: "" }],
    steps: [""],
    tags: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitCooldown, setIsSubmitCooldown] = useState(false);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState(null);

  const [noteImages, setNoteImages] = useState([]);
  const [tempNoteImages, setTempNoteImages] = useState([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [subrecipes, setSubrecipes] = useState([]);
  const [selectedSubrecipeId, setSelectedSubrecipeId] = useState("");

  useEffect(() => {
    if (recipe) {
      let steps = [];
      const fetchSubrecipes = async (ids) => {
        const subrecipesMap = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await fetch(`/api/subrecipes/${id}`, {
                credentials: "include",
              });
              if (res.ok) {
                subrecipesMap[id] = await res.json();
              }
            } catch {}
          })
        );
        return subrecipesMap;
      };
      const setupForm = async () => {
        if (Array.isArray(recipe.steps)) {
          steps = recipe.steps;
        } else if (recipe.instructions && recipe.stepSubrecipes) {
          let subrecipesData = recipe.subrecipes || {};
          const missingIds = recipe.stepSubrecipes.filter(
            (id) => id && !subrecipesData[id]
          );
          if (missingIds.length > 0) {
            const fetched = await fetchSubrecipes(missingIds);
            subrecipesData = { ...subrecipesData, ...fetched };
          }
          steps = recipe.instructions.map((step, idx) => {
            const subId = recipe.stepSubrecipes[idx];
            if (subId && subrecipesData[subId]) {
              return { type: "subrecipe", subrecipe: subrecipesData[subId] };
            }
            return step;
          });
        } else {
          steps = recipe.instructions || [""];
        }
        setFormData({
          ...recipe,
          baseValue: recipe.baseValue || recipe.servings || 4,
          baseUnit:
            recipe.baseUnit ||
            (recipe.servings === 1 ? "personne" : "personnes"),
          restTime: recipe.restTime || 0,
          chillTime: recipe.chillTime || 0,
          freezeTime: recipe.freezeTime || 0,
          steps,
          tags: recipe.tags ? recipe.tags.join(", ") : "",
        });
        if (recipe.image) {
          setImagePreview(recipe.image);
        }
        if (recipe.id) {
          loadNoteImages(recipe.id);
        }
      };
      setupForm();
    } else {
      setNoteImages([]);
      setTempNoteImages([]);
    }
  }, [recipe]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/subrecipes`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setSubrecipes(data);
        }
      } catch (err) {}
    })();
  }, []);

  const loadNoteImages = async (recipeId) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/note-images`, {
        credentials: "include",
      });

      if (response.ok) {
        const images = await response.json();
        setNoteImages(images);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des images de notes:", error);
    }
  };

  const handleNoteImageUploaded = (newImage) => {
    if (recipe?.id) {
      setNoteImages((prev) => [...prev, newImage]);
    } else {
      setTempNoteImages((prev) => [...prev, newImage]);
    }
  };

  const uploadTempImagesToRecipe = async (recipeId) => {
    if (tempNoteImages.length === 0) return;

    try {
      for (const tempImage of tempNoteImages) {
        if (tempImage.file) {
          const formData = new FormData();
          formData.append("image", tempImage.file);

          const response = await fetch(`/api/recipes/${recipeId}/note-images`, {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (response.ok) {
            const result = await response.json();
            setNoteImages((prev) => [...prev, result]);
          }
        }
      }

      setTempNoteImages([]);
    } catch (error) {
      console.error("Erreur lors de l'upload des images temporaires:", error);
    }
  };

  const handleNoteImageDelete = async (imageId) => {
    const tempImage = tempNoteImages.find((img) => img.id === imageId);
    if (tempImage) {
      setTempNoteImages((prev) => prev.filter((img) => img.id !== imageId));

      if (tempImage.image_url && tempImage.image_url.startsWith("blob:")) {
        URL.revokeObjectURL(tempImage.image_url);
      }
      return;
    }

    if (!recipe?.id) {
      alert("Aucune recette sélectionnée");
      return;
    }

    try {
      const response = await fetch(
        `/api/recipes/${recipe.id}/note-images/${imageId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        const allImages = [...noteImages, ...tempNoteImages];
        const updatedImages = noteImages.filter((img) => img.id !== imageId);
        setNoteImages(updatedImages);

        if (showImageGallery) {
          const deletedIndex = allImages.findIndex((img) => img.id === imageId);
          const newAllImages = [...updatedImages, ...tempNoteImages];

          if (newAllImages.length === 0) {
            setShowImageGallery(false);
          } else if (galleryStartIndex >= newAllImages.length) {
            setGalleryStartIndex(newAllImages.length - 1);
          } else if (deletedIndex < galleryStartIndex) {
            setGalleryStartIndex(galleryStartIndex - 1);
          }
        }
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de l'image");
    }
  };

  const handleImageClick = (index) => {
    setGalleryStartIndex(index);
    setShowImageGallery(true);
  };
  const handleCloseGallery = () => {
    setShowImageGallery(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const isTimeField = [
        "prepTime",
        "cookingTime",
        "restTime",
        "chillTime",
        "freezeTime",
      ].includes(name);

      const newData = {
        ...prev,
        [name]: value,
        ...(isTimeField
          ? {
              totalTime:
                (name === "prepTime" ? parseInt(value) || 0 : prev.prepTime) +
                (name === "cookingTime"
                  ? parseInt(value) || 0
                  : prev.cookingTime) +
                (name === "restTime" ? parseInt(value) || 0 : prev.restTime) +
                (name === "chillTime" ? parseInt(value) || 0 : prev.chillTime) +
                (name === "freezeTime"
                  ? parseInt(value) || 0
                  : prev.freezeTime),
            }
          : {}),
      };

      if (
        name === "baseValue" &&
        prev.baseUnit.toLowerCase().includes("personne")
      ) {
        newData.servings = parseInt(value) || 1;
      }
      if (name === "baseUnit" && value.toLowerCase().includes("personne")) {
        newData.servings = parseInt(prev.baseValue) || 1;
      }

      return newData;
    });
  };

  const formatBaseValueForDisplay = (val) => {
    if (val === null || val === undefined || val === "") return "";
    const s = String(val);
    if (/^-?\d+(?:\.0+)$/.test(s)) {
      return s.split(".")[0];
    }
    return s;
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData((prev) => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: "", quantity: "", unit: "" }],
    }));
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, ingredients: newIngredients }));
    }
  };

  const handleStepChange = (index, value) => {
    const limitedValue = value.length > 230 ? value.substring(0, 230) : value;
    const newSteps = [...formData.steps];
    newSteps[index] = limitedValue;
    setFormData((prev) => ({ ...prev, steps: newSteps }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, ""],
    }));
  };

  const removeStep = (index) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, steps: newSteps }));
    }
  };

  const removeSubrecipeBlock = (index) => {
    const step = formData.steps[index];
    if (!step || step.type !== "subrecipe" || !step.subrecipe) return;
    const subId = step.subrecipe.id;

    const newSteps = formData.steps.filter((_, i) => i !== index);

    const newIngredients = formData.ingredients.filter(
      (ing) => String(ing.__subrecipeId || "") !== String(subId)
    );

    setFormData((prev) => ({
      ...prev,
      steps: newSteps,
      ingredients: newIngredients,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setOriginalImageFile(file);
        setShowImageCropper(true);
      } else {
        alert("Veuillez sélectionner un fichier image valide.");
      }
    }
  };

  const handleImageCrop = (croppedFile) => {
    setImageFile(croppedFile);
    setShowImageCropper(false);
    setOriginalImageFile(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(croppedFile);
  };

  const handleImageCropCancel = () => {
    setShowImageCropper(false);
    setOriginalImageFile(null);
    const fileInput = document.getElementById("image-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    setIsUploading(true);

    try {
      const data = await recipeService.uploadImage(imageFile);

      if (data.format === "webp") {
        console.log("Image convertie en WebP:", data.optimizedFilename);
        console.log("URL de l'image:", data.imageUrl);
      }

      return data.imageUrl;
    } catch (error) {
      console.error("Erreur upload image:", error);
      alert(`Erreur lors de l'upload de l'image: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleInsertSubrecipe = async () => {
    if (!selectedSubrecipeId) return;
    try {
      const res = await fetch(`/api/subrecipes/${selectedSubrecipeId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur récupération sous-recette");
        return;
      }
      const sub = await res.json();

      const mergedIngredients = [
        ...formData.ingredients,
        ...(Array.isArray(sub.ingredients)
          ? sub.ingredients.map((ing) => ({ ...ing, __subrecipeId: sub.id }))
          : []),
      ];

      const mergedSteps = [
        ...formData.steps,
        { type: "subrecipe", subrecipe: sub },
      ];

      setFormData((prev) => ({
        ...prev,
        ingredients: mergedIngredients,
        steps: mergedSteps,
      }));
      setSelectedSubrecipeId("");
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de l'insertion");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitCooldown) {
      return;
    }

    if (!recipe) {
      const keywords = ["air", "vent"];
      const ingredientText = formData.ingredients
        .map((ing) => (ing.name || "").toLowerCase())
        .join(" ");
      if (keywords.some((k) => ingredientText.includes(k))) {
        window.history.pushState({}, "", "/418");
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }
    }

    const clientErrors = [];

    if (!formData.name.trim()) {
      clientErrors.push("Le nom de la recette est obligatoire");
    }

    if (!formData.prepTime || formData.prepTime <= -1) {
      clientErrors.push("Le temps de préparation doit être positif");
    }

    if (
      formData.cookingTime === null ||
      formData.cookingTime === undefined ||
      formData.cookingTime < 0
    ) {
      clientErrors.push("Le temps de cuisson doit être positif ou nul");
    }

    if (!formData.servings || formData.servings <= 0) {
      clientErrors.push("La quantité doit être positive");
    }

    if (
      formData.ingredients.length === 0 ||
      formData.ingredients.every((ing) => !ing.name.trim())
    ) {
      clientErrors.push("Au moins un ingrédient est requis");
    }

    if (
      formData.ingredients.some(
        (ing) =>
          ing.name.trim() && (!ing.quantity || isNaN(parseFloat(ing.quantity)))
      )
    ) {
      clientErrors.push(
        "Tous les ingrédients nommés doivent avoir une quantité valide"
      );
    }

    const hasValidStep =
      formData.steps &&
      formData.steps.some((step) =>
        typeof step === "string" ? step.trim() : true
      );
    if (!hasValidStep) {
      clientErrors.push("Au moins une étape de préparation est requise");
    }

    if (clientErrors.length > 0) {
      clientErrors.forEach((error) => {
        if (showNotification) {
          showNotification(error, "error");
        } else {
          console.error("Erreur de validation:", error);
        }
      });
      return;
    }

    let imageUrl = formData.image;
    if (imageFile) {
      const uploadedImageUrl = await uploadImage();
      if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
      }
    }

    const processedData = {
      ...formData,
      image: imageUrl,
      prepTime: parseInt(formData.prepTime),
      cookingTime: parseInt(formData.cookingTime),
      restTime: parseInt(formData.restTime) || 0,
      chillTime: parseInt(formData.chillTime) || 0,
      freezeTime: parseInt(formData.freezeTime) || 0,
      totalTime:
        parseInt(formData.prepTime) +
        parseInt(formData.cookingTime) +
        (parseInt(formData.restTime) || 0) +
        (parseInt(formData.chillTime) || 0) +
        (parseInt(formData.freezeTime) || 0),
      servings: parseInt(formData.servings),
      baseValue: parseFloat(formData.baseValue),
      baseUnit: formData.baseUnit.trim(),
      rating: parseInt(formData.rating),
      ingredients: formData.ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          ...ing,
          quantity: parseFloat(ing.quantity),
        })),

      instructions: [],
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };

    const flattenedInstructions = [];
    const stepSubrecipes = [];
    for (const s of formData.steps) {
      if (typeof s === "string") {
        if (s.trim()) {
          flattenedInstructions.push(s.trim());
          stepSubrecipes.push(null);
        }
      } else if (s && s.type === "subrecipe" && s.subrecipe) {
        flattenedInstructions.push(`Sous-recette: ${s.subrecipe.name}`);
        stepSubrecipes.push(s.subrecipe.id);
      }
    }
    processedData.instructions = flattenedInstructions;
    processedData.steps = formData.steps;
    processedData.stepSubrecipes = stepSubrecipes;

    setIsSubmitCooldown(true);

    try {
      const savedRecipe = await onSave(processedData);

      if (!recipe && savedRecipe && tempNoteImages.length > 0) {
        await uploadTempImagesToRecipe(savedRecipe.id);
      }

      if (onAfterSave) {
        onAfterSave(savedRecipe, tempNoteImages);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);

      if (error.details && Array.isArray(error.details)) {
        error.details.forEach((err) => {
          if (showNotification) {
            showNotification(err, "error");
          }
        });
      } else {
        // Erreur générale
        if (showNotification) {
          showNotification(
            error.message || "Erreur lors de la sauvegarde",
            "error"
          );
        } else {
          alert(error.message || "Erreur lors de la sauvegarde");
        }
      }
    }

    setTimeout(() => {
      setIsSubmitCooldown(false);
    }, 3000);
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content recipe-form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="form-header">
          <h2>{recipe ? "Modifier la recette" : "Nouvelle recette"}</h2>
          <button className="close-btn" onClick={onCancel}>
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className="recipe-form-content">
          <div className="form-section">
            <div className="section-header">
              <h3>Informations générales</h3>
              {/* <div className="visibility-compact">
                <label className="visibility-compact-label">Visibilité :</label>
                <div className="visibility-compact-options">
                  <button
                    type="button"
                    className={`visibility-compact-btn ${
                      formData.visibility === "private" ? "active" : ""
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        visibility: "private",
                      }))
                    }
                    title="Visible uniquement par vous
                    }
                    title="Visible par tous (bientôt disponible)"
                  >
                    Publique
                  </button>
                  <button
                    type="button"
                    className={`visibility-compact-btn ${
                      formData.visibility === "link_only" ? "active" : ""
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        visibility: "link_only",
                      }))
                    }
                    title="Accessible via lien partagé seulement"
                  >
                    Lien uniquement
                  </button>
                </div>
              </div> */}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nom de la recette *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Image de la recette</label>
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="form-input"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="btn-add btn"
                  style={{ color: "#F2F2F2", width: "21%" }}
                >
                  {imageFile ? "Changer l'image" : "Ajouter une image"}
                </label>

                {imagePreview && (
                  <div className="image-preview">
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      style={{
                        maxWidth: "200px",
                        maxHeight: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        marginTop: "10px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        setFormData((prev) => ({ ...prev, image: "" }));
                      }}
                      className="remove-image-btn"
                      style={{
                        background: "#ff4444",
                        color: "#F2F2F2",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        marginLeft: "10px",
                        cursor: "pointer",
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                )}

                {isUploading && (
                  <div style={{ marginTop: "10px", color: "#666" }}>
                    Upload en cours...
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Catégorie</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {RECIPE_FILTERS.categories
                    .filter((cat) => cat.value !== "all")
                    .map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {RECIPE_FILTERS.types
                    .filter((type) => type.value !== "all")
                    .map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Temps de préparation (min)</label>
                <input
                  type="number"
                  name="prepTime"
                  value={formData.prepTime}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Temps de cuisson (min)</label>
                <input
                  type="number"
                  name="cookingTime"
                  value={formData.cookingTime}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  placeholder="Optionnel"
                />
              </div>

              <div className="form-group">
                <label>Temps de repos (min)</label>
                <input
                  type="number"
                  name="restTime"
                  value={formData.restTime}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Temps de réfrigération (min)</label>
                <input
                  type="number"
                  name="chillTime"
                  value={formData.chillTime}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  placeholder="Optionnel"
                />
              </div>

              <div className="form-group">
                <label>Temps de congélation (min)</label>
                <input
                  type="number"
                  name="freezeTime"
                  value={formData.freezeTime}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  placeholder="Optionnel"
                />
              </div>

              <div className="form-group">
                <label>Note (0-5)</label>
                <input
                  type="number"
                  name="rating"
                  value={formData.rating}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  max="5"
                />
              </div>
            </div>

            <input type="hidden" name="servings" value={formData.servings} />

            <div className="form-group base-calculation-block">
              <label>Pour combien cette recette est-elle prévue ?</label>
              <div className="base-input-group">
                <input
                  type="number"
                  name="baseValue"
                  value={formatBaseValueForDisplay(formData.baseValue)}
                  onChange={handleInputChange}
                  className="form-input base-value"
                  min="0.1"
                  step="0.1"
                  placeholder="Quantité"
                />
                <input
                  type="text"
                  name="baseUnit"
                  value={formData.baseUnit}
                  onChange={handleInputChange}
                  className="form-input base-unit"
                  placeholder="ex: personnes, g de pâtes, pieces, cm..."
                />
              </div>
              <small className="form-hint">
                Exemples: "4 personnes", "500 g de pâtes", "24 pièces", "26 cm
                de diamètre"
              </small>
            </div>
          </div>

          <div className="form-section">
            <h3>Ingrédients *</h3>
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="ingredient-row">
                <input
                  type="text"
                  placeholder="Nom de l'ingrédient"
                  value={ingredient.name}
                  onChange={(e) =>
                    handleIngredientChange(index, "name", e.target.value)
                  }
                  className="form-input"
                />
                <input
                  type="number"
                  placeholder="Quantité"
                  value={ingredient.quantity}
                  onChange={(e) =>
                    handleIngredientChange(index, "quantity", e.target.value)
                  }
                  className="form-input"
                  step="0.1"
                />
                <input
                  type="text"
                  placeholder="Unité (optionnel)"
                  value={ingredient.unit}
                  onChange={(e) =>
                    handleIngredientChange(index, "unit", e.target.value)
                  }
                  className="form-input"
                />

                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="btn btn-danger btn-small"
                  disabled={formData.ingredients.length === 1}
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
          </div>

          {/* Étapes */}
          <div className="form-section">
            <h3>Étapes de préparation *</h3>
            {formData.steps.map((step, index) => (
              <div key={index} className="step-row">
                <span className="step-number">{index + 1}</span>
                <div className="step-input-container">
                  {typeof step === "string" ? (
                    <>
                      <textarea
                        placeholder="Décrivez cette étape..."
                        value={step}
                        onChange={(e) =>
                          handleStepChange(index, e.target.value)
                        }
                        className="form-textarea"
                        rows={3}
                        maxLength={230}
                      />
                      <div className="character-counter">
                        <span
                          className={step.length > 200 ? "counter-warning" : ""}
                        >
                          {step.length}/230 caractères
                        </span>
                      </div>
                    </>
                  ) : step && step.type === "subrecipe" ? (
                    <div className="subrecipe-block">
                      <div className="subrecipe-header">
                        {step.subrecipe.image_url ? (
                          <img
                            src={step.subrecipe.image_url}
                            alt={step.subrecipe.name}
                            className="subrecipe-thumb"
                          />
                        ) : (
                          <div className="subrecipe-thumb placeholder" />
                        )}
                        <div className="subrecipe-meta">
                          <strong>{step.subrecipe.name}</strong>
                          {step.subrecipe.description && (
                            <p
                              style={{
                                margin: "8px 0 0",
                                fontSize: "14px",
                                color: "#6b7280",
                              }}
                            >
                              {step.subrecipe.description}
                            </p>
                          )}
                          <div className="subrecipe-actions">
                            <button
                              type="button"
                              className="btn btn-danger btn-small"
                              onClick={() => removeSubrecipeBlock(index)}
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="subrecipe-body">
                        <div className="subrecipe-ingredients">
                          <em>Ingrédients :</em>
                          <ul>
                            {(step.subrecipe.ingredients || []).map(
                              (ing, i) => (
                                <li key={i}>
                                  {ing.quantity !== undefined &&
                                  ing.quantity !== null &&
                                  ing.quantity !== ""
                                    ? `${ing.quantity} ${ing.unit || ""} `
                                    : ""}
                                  {ing.name}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                        <div className="subrecipe-instructions">
                          <em>Préparations :</em>
                          <ol>
                            {(step.subrecipe.instructions || []).map(
                              (st, i) => (
                                <li key={i}>{st}</li>
                              )
                            )}
                          </ol>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="btn btn-danger btn-small"
                  disabled={formData.steps.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="btn btn-secondary"
            >
              + Ajouter une étape
            </button>
          </div>
          <div className="form-subrecipe">
            <h3>Library / Sous-recettes</h3>
            <div
              className="select-menu"
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <select
                className="form-select"
                value={selectedSubrecipeId}
                onChange={(e) => setSelectedSubrecipeId(e.target.value)}
              >
                <option value="">-- Sélectionner une sous-recette --</option>
                {subrecipes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleInsertSubrecipe}
                className="btn btn-secondary"
                disabled={!selectedSubrecipeId}
                style={{ height: "50px", width: "100px" }}
              >
                + Insérer
              </button>

              <a href="/subrecipes" style={{ margin: 8, height: "50px" }}>
                Gérer ma library
              </a>
            </div>
          </div>
          <div className="form-section">
            <div className="form-group">
              <label>Tags (séparés par des virgules)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="form-input"
                placeholder="ex: rapide, italien, réconfortant"
              />
            </div>

            <div className="form-group">
              <NoteImageUploader
                recipeId={recipe?.id}
                onImageUploaded={handleNoteImageUploaded}
                currentImageCount={noteImages.length + tempNoteImages.length}
                disabled={isUploading || isSubmitCooldown}
              />

              {(noteImages.length > 0 || tempNoteImages.length > 0) && (
                <NoteImageThumbnails
                  images={[...noteImages, ...tempNoteImages]}
                  onImageClick={handleImageClick}
                  onImageDelete={handleNoteImageDelete}
                  isEditing={true}
                />
              )}
            </div>

            <div className="form-group">
              <label>Notes personnelles</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn-add btn"
            >
              Annuler
            </button>
            <button type="submit" className="btn-add btn">
              {recipe ? "Sauvegarder" : "Créer la recette"}
            </button>
          </div>
        </form>
      </div>

      {showImageCropper && originalImageFile && (
        <ImageCropper
          imageFile={originalImageFile}
          onCrop={handleImageCrop}
          onCancel={handleImageCropCancel}
        />
      )}

      {showImageGallery &&
        (noteImages.length > 0 || tempNoteImages.length > 0) && (
          <ImageGallery
            images={[...noteImages, ...tempNoteImages]}
            initialIndex={galleryStartIndex}
            onClose={handleCloseGallery}
            onDelete={handleNoteImageDelete}
          />
        )}
    </div>
  );
};

export default RecipeForm;
