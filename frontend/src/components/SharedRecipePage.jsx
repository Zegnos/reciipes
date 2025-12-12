import React, { useState, useEffect } from "react";
import { getAuthUrl } from "../services/recipeService";
import NoteImageThumbnails from "./NoteImageThumbnails";
import ImageGallery from "./ImageGallery";
import { parseRating, buildRatingStars } from "../services/recipeService";

const SharedRecipePage = ({ shareToken }) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [adding, setAdding] = useState(false);
  const [servings, setServings] = useState(4);

  const [noteImages, setNoteImages] = useState([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  useEffect(() => {
    loadRecipe();
    checkAuth();
  }, [shareToken]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/share/${shareToken}`);

      if (!response.ok) {
        throw new Error("Recette non trouvée");
      }

      const recipeData = await response.json();
      setRecipe(recipeData);
      setServings(recipeData.servings);

      if (recipeData && recipeData.id) {
        loadNoteImages(recipeData.id);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/user", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {}
  };

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

  const handleImageClick = (index) => {
    setGalleryStartIndex(index);
    setShowImageGallery(true);
  };

  const handleCloseGallery = () => {
    setShowImageGallery(false);
  };

  const handleLogin = () => {
    window.location.href = getAuthUrl();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/share/${shareToken}/pdf`);

      if (!response.ok) {
        throw new Error("Erreur lors du téléchargement");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${recipe.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Erreur lors du téléchargement du PDF");
    }
  };

  const handleAddToCollection = async () => {
    if (!user) {
      handleLogin();
      return;
    }

    try {
      setAdding(true);
      const response = await fetch(`/api/share/${shareToken}/add`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout");
      }

      const result = await response.json();
      alert("Recette ajoutée à votre collection avec succès !");

      window.location.href = "/";
    } catch (error) {
      alert(error.message);
    } finally {
      setAdding(false);
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  const calculateProportions = (
    originalQuantity,
    originalServings,
    newServings
  ) => {
    const ratio = newServings / originalServings;
    return Math.round(originalQuantity * ratio * 100) / 100;
  };

  const renderRating = (rawRating) => {
    const { value, votes, isFallback } = parseRating(rawRating);
    const label = isFallback
      ? "Recette sans note"
      : `Note ${value.toFixed(1)} sur 5`;

    return (
      <div
        className={`recipe-rating${isFallback ? " rating-empty" : ""}`}
        aria-label={label}
      >
        <span className="rating-stars">{buildRatingStars(value)}</span>
        {isFallback ? (
          <span className="rating-placeholder">Nouveau</span>
        ) : (
          <>
            <span className="rating-value">{value.toFixed(1)}</span>
            {votes ? (
              <span className="rating-votes">({votes} avis)</span>
            ) : null}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="shared-recipe-page">
        <div className="loading">
          <h2>Chargement de la recette...</h2>
          <p>Merci de patienter</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-recipe-page">
        <div className="error-state">
          <h2>Recette non trouvée</h2>
          <p>{error}</p>
          <p>Ce lien de partage est peut-être expiré ou invalide.</p>
          <button
            className="btn btn-primary"
            onClick={() => (window.location.href = "/")}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-recipe-page">
      {/* Header avec branding */}
      <div className="shared-header">
        <div className="brand">
          <h1>Reciipes</h1>
        </div>
        {user ? (
          <div className="user-info">
            <img src={user.avatar_url} alt="/failuser.png" />
            <span>Connecté en tant que {user.name}</span>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleLogin}>
            Se connecter
          </button>
        )}
      </div>

      {/* Contenu de la recette */}
      <div className="recipe-content">
        {/* En-tête de la recette */}
        <div className="recipe-header">
          <div className="recipe-image">
            {recipe.image ? (
              <img src={recipe.image} alt={recipe.name} />
            ) : (
              <div className="placeholder-image">Illustration</div>
            )}
          </div>

          <div className="recipe-info">
            <h1 className="recipe-title">{recipe.name}</h1>
            {recipe.description && (
              <p className="recipe-description">{recipe.description}</p>
            )}

            <div className="recipe-badges">
              <span className="badge badge-category">{recipe.category}</span>
              <span className="badge badge-type">{recipe.type}</span>
            </div>

            {renderRating(recipe.rating)}

            {recipe.author_name && (
              <p className="recipe-author">Créée par : {recipe.author_name}</p>
            )}
          </div>
        </div>

        {/* Informations de temps */}
        <div className="recipe-times">
          <div className="time-info">
            <span className="time-label">Préparation</span>
            <span className="time-value">{formatTime(recipe.prepTime)}</span>
          </div>
          <div className="time-info">
            <span className="time-label">Cuisson</span>
            <span className="time-value">{formatTime(recipe.cookingTime)}</span>
          </div>
          <div className="time-info">
            <span className="time-label">Total</span>
            <span className="time-value">{formatTime(recipe.totalTime)}</span>
          </div>
        </div>

        {/* Calculateur de portions */}
        <div className="servings-calculator">
          <h3>Portions</h3>
          <div className="servings-controls">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              className="btn btn-secondary"
            >
              -
            </button>
            <span className="servings-display">
              {servings} personne{servings > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setServings(servings + 1)}
              className="btn btn-secondary"
            >
              +
            </button>
          </div>
          {servings !== recipe.servings && (
            <p className="proportions-info">
              Quantités ajustées pour {servings} personne
              {servings > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Ingrédients */}
        <div className="recipe-section">
          <h3>Ingrédients</h3>
          <ul className="ingredients-list">
            {recipe.ingredients.map((ingredient, index) => {
              const adjustedQuantity = calculateProportions(
                ingredient.quantity,
                recipe.servings,
                servings
              );

              return (
                <li key={index} className="ingredient-item">
                  <span className="ingredient-quantity">
                    {adjustedQuantity} {ingredient.unit}
                  </span>
                  <span className="ingredient-name">{ingredient.name}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Étapes */}
        <div className="recipe-section">
          <h3>Préparation</h3>
          <ol className="steps-list">
            {recipe.instructions &&
              recipe.instructions.map((step, index) => (
                <li key={index} className="step-item">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
          </ol>
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="recipe-section">
            <h3>Tags</h3>
            <div className="tags-list">
              {recipe.tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {(recipe.notes || noteImages.length > 0) && (
          <div className="recipe-section">
            <h3>Notes</h3>

            {/* Images de notes */}
            {noteImages.length > 0 && (
              <div className="notes-images-section">
                <NoteImageThumbnails
                  images={noteImages}
                  onImageClick={handleImageClick}
                  isEditing={false}
                />
              </div>
            )}

            {/* Texte des notes */}
            {recipe.notes && <p className="recipe-notes">{recipe.notes}</p>}
          </div>
        )}
      </div>
      {/* Actions principales */}
      <div className="shared-actions">
        <button className="btn btn-secondary" onClick={handleDownloadPDF}>
          �️ Imprimer / PDF
        </button>

        <button
          className="btn btn-primary"
          onClick={handleAddToCollection}
          disabled={adding}
        >
          {adding ? "⏳ Ajout..." : "💾 Ajouter à ma collection"}
        </button>
      </div>
      {/* Footer */}
      <div className="shared-footer">
        <p>📝 Mes Recettes - Application de gestion de recettes</p>
        <button
          className="btn btn-primary"
          onClick={() => (window.location.href = "/")}
        >
          🚀 Créer votre propre collection
        </button>
      </div>

      {/* Galerie d'images de notes */}
      {showImageGallery && noteImages.length > 0 && (
        <ImageGallery
          images={noteImages}
          initialIndex={galleryStartIndex}
          onClose={handleCloseGallery}
          onDelete={null} // Pas de suppression en mode lecture
        />
      )}
    </div>
  );
};

export default SharedRecipePage;
