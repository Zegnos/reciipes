import React, { useState, useEffect } from "react";
import NoteImageThumbnails from "./NoteImageThumbnails";
import ImageGallery from "./ImageGallery";
import { parseRating, buildRatingStars } from "../services/recipeService";

const RecipeDetail = ({ recipe, onClose, onEdit, onDelete }) => {
  const [baseValue, setBaseValue] = useState(() => {
    const value = recipe.baseValue || recipe.servings || 4;
    return Math.round(value);
  });
  const [inputValue, setInputValue] = useState(() => {
    const initialValue = recipe.baseValue || recipe.servings || 4;
    return Math.round(initialValue).toString();
  });

  const [noteImages, setNoteImages] = useState([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  const [subrecipes, setSubrecipes] = useState({});

  useEffect(() => {
    if (recipe && recipe.id) {
      loadNoteImages(recipe.id);
      loadSubrecipes();
    }
  }, [recipe]);

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

  const renderRating = (rawRating, variant = "default") => {
    const { value, votes, isFallback } = parseRating(rawRating);
    const className = `${
      variant === "large" ? "recipe-rating-large" : "recipe-rating"
    }${isFallback ? " rating-empty" : ""}`;
    const label = isFallback
      ? "Recette sans note"
      : `Note ${value.toFixed(1)} sur 5`;

    return (
      <div className={className} aria-label={label}>
        <span className="rating-stars">{buildRatingStars(value)}</span>
        {isFallback ? (
          <span className="rating-placeholder">Nouveau</span>
        ) : (
          <>
            
            {votes ? (
              <span className="rating-votes">({votes} avis)</span>
            ) : null}
          </>
        )}
      </div>
    );
  };

  const loadSubrecipes = async () => {
    if (!recipe?.stepSubrecipes || recipe.stepSubrecipes.length === 0) {
      return;
    }

    try {
      const uniqueIds = [
        ...new Set(recipe.stepSubrecipes.filter((id) => id !== null)),
      ];

      if (uniqueIds.length === 0) {
        return;
      }

      const subrecipesData = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const response = await fetch(`/api/subrecipes/${id}`, {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              subrecipesData[id] = data;
            }
          } catch (err) {
            console.error(`Erreur chargement sous-recette ${id}:`, err);
          }
        })
      );

      setSubrecipes(subrecipesData);
    } catch (error) {
      console.error("Erreur lors du chargement des sous-recettes:", error);
    }
  };

  const handleImageClick = (index) => {
    setGalleryStartIndex(index);
    setShowImageGallery(true);
  };

  const handleCloseGallery = () => {
    setShowImageGallery(false);
  };
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  const calculateProportions = (originalQuantity, originalBase, newBase) => {
    if (!originalQuantity || !originalBase || !newBase) return 0;
    const ratio = newBase / originalBase;
    const result = originalQuantity * ratio;

    const rounded = Math.round(result * 1000) / 1000;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
      return Math.round(rounded);
    }

    return Math.round(rounded * 100) / 100;
  };

  const formatNumber = (num) => {
    if (!num || num === 0) return "0";

    const number = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(number)) return "0";

    const rounded = Math.round(number * 1000) / 1000;
    if (rounded % 1 === 0) return Math.round(rounded).toString();

    const formatted = rounded.toFixed(2);
    return parseFloat(formatted).toString();
  };

  const formatBaseValue = (num) => {
    const number = typeof num === "string" ? parseInt(num) : Math.round(num);
    return isNaN(number) ? "1" : number.toString();
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const response = await fetch(`/api/recipes/${recipe.id}/share`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création du lien de partage");
      }

      const data = await response.json();
      const fullUrl = `${window.location.origin}/share/${data.shareToken}`;
      setShareUrl(fullUrl);

      await navigator.clipboard.writeText(fullUrl);
      alert("Lien de partage copié dans le presse-papiers.");
    } catch (error) {
      console.error("Erreur lors du partage:", error);
      alert("Erreur lors de la création du lien de partage");
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/pdf`, {
        credentials: "include",
      });

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

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      alert("Lien copié dans le presse-papiers.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content recipe-detail"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec image et actions */}
        <div className="recipe-detail-header">
          <button className="close-btn" onClick={onClose}>
            X
          </button>

          <div className="recipe-detail-image">
            {recipe.image ? (
              <img src={recipe.image} alt={recipe.name} />
            ) : (
              <div className="placeholder-image">Illustration</div>
            )}
          </div>

          <div className="recipe-detail-title-section">
            <h1 className="recipe-detail-title">{recipe.name}</h1>
            <p className="recipe-detail-description">{recipe.description}</p>

            <div className="recipe-detail-badges">
              <span className="badge badge-category">{recipe.category}</span>
              <span className="badge badge-type">{recipe.type}</span>
            </div>

            {renderRating(recipe.rating, "large")}
          </div>
        </div>

        {/* Actions */}
        <div className="recipe-detail-actions">
          <button className="btn btn-secondary" onClick={() => onEdit(recipe)}>
            Modifier
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? "Création..." : "Partager"}
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadPDF}>
            PDF
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onDelete(recipe.id)}
          >
            Supprimer
          </button>
        </div>

        {/* Lien de partage */}
        {shareUrl && (
          <div className="share-link-section">
            <h3>Lien de partage</h3>
            <div className="share-link-container">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="share-link-input"
              />
              <button className="btn btn-secondary" onClick={copyShareLink}>
                Copier
              </button>
            </div>
          </div>
        )}

        {/* Informations de temps */}
        <div className="recipe-detail-times">
          {recipe.prepTime > 0 && (
            <div className="time-info">
              <span className="time-label">Préparation</span>
              <span className="time-value">{formatTime(recipe.prepTime)}</span>
            </div>
          )}
          {recipe.cookingTime > 0 && (
            <div className="time-info">
              <span className="time-label">Cuisson</span>
              <span className="time-value">
                {formatTime(recipe.cookingTime)}
              </span>
            </div>
          )}
          {recipe.restTime > 0 && (
            <div className="time-info">
              <span className="time-label">Repos</span>
              <span className="time-value">{formatTime(recipe.restTime)}</span>
            </div>
          )}
          {recipe.chillTime > 0 && (
            <div className="time-info">
              <span className="time-label">Réfrigération</span>
              <span className="time-value">{formatTime(recipe.chillTime)}</span>
            </div>
          )}
          {recipe.freezeTime > 0 && (
            <div className="time-info">
              <span className="time-label">Congélation</span>
              <span className="time-value">
                {formatTime(recipe.freezeTime)}
              </span>
            </div>
          )}
          <div className="time-info time-total">
            <span className="time-label">Total</span>
            <span className="time-value">{formatTime(recipe.totalTime)}</span>
          </div>
        </div>

        {/* Calculateur de portions flexible */}
        <div className="servings-calculator">
          <h3>Quantités</h3>
          <div className="servings-controls">
            <button
              onClick={() => {
                const currentValue = parseInt(baseValue) || 1;
                const newValue = Math.max(1, currentValue - 1);

                setBaseValue(newValue);
                setInputValue(newValue.toString());
              }}
              className="btn btn-secondary"
            >
              -
            </button>
            <input
              type="number"
              value={inputValue || ""}
              onChange={(e) => {
                const value = e.target.value;
                setInputValue(value);
              }}
              onBlur={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1) {
                  setBaseValue(value);
                  setInputValue(value.toString());
                } else {
                  const fallbackValue = parseInt(baseValue) || 4;
                  setInputValue(fallbackValue.toString());
                  setBaseValue(fallbackValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.blur(); // Déclenche onBlur
                }
              }}
              className="servings-input"
              min="1"
              step="1"
            />
            <span className="servings-unit">
              {recipe.baseUnit ||
                (recipe.servings === 1 ? "personne" : "personnes")}
            </span>
            <button
              onClick={() => {
                const currentValue = parseInt(baseValue) || 1;
                const newValue = currentValue + 1;

                setBaseValue(newValue);
                setInputValue(newValue.toString());
              }}
              className="btn btn-secondary"
            >
              +
            </button>
          </div>
          {baseValue !== (recipe.baseValue || recipe.servings) && (
            <p className="proportions-info">
              Quantités ajustées pour {formatBaseValue(baseValue)}{" "}
              {recipe.baseUnit || (baseValue === 1 ? "personne" : "personnes")}
            </p>
          )}
        </div>

        {/* Ingrédients */}
        <div className="recipe-detail-section">
          <h3>Ingrédients</h3>
          <ul className="ingredients-list">
            {recipe.ingredients.map((ingredient, index) => {
              const adjustedQuantity = calculateProportions(
                ingredient.quantity,
                recipe.baseValue || recipe.servings,
                baseValue
              );

              return (
                <li key={index} className="ingredient-item">
                  <span className="ingredient-quantity">
                    {formatNumber(adjustedQuantity)} {ingredient.unit}
                  </span>
                  <span className="ingredient-name">{ingredient.name}</span>
                  {baseValue !== (recipe.baseValue || recipe.servings) && (
                    <span className="original-quantity">
                      (orig: {formatNumber(ingredient.quantity)}{" "}
                      {ingredient.unit})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Étapes */}
        <div className="recipe-detail-section">
          <h3>Préparation</h3>
          <ol className="steps-list">
            {recipe.instructions &&
              recipe.instructions.map((step, index) => {
                const subrecipeId =
                  recipe.stepSubrecipes && recipe.stepSubrecipes[index];
                const subrecipe = subrecipeId ? subrecipes[subrecipeId] : null;

                if (subrecipe) {
                  return (
                    <li key={index} className="step-item-subrecipe">
                      <div
                        style={{ display: "flex", alignItems: "flex-start" }}
                      >
                        <span
                          className="step-number"
                          style={{ marginRight: 16 }}
                        >
                          {index + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div className="subrecipe-block">
                            <div className="subrecipe-header">
                              {subrecipe.image_url ? (
                                <img
                                  src={subrecipe.image_url}
                                  alt={subrecipe.name}
                                  className="subrecipe-thumb"
                                />
                              ) : (
                                <div className="subrecipe-thumb placeholder" />
                              )}
                              <div className="subrecipe-meta">
                                <strong>{subrecipe.name}</strong>
                                {subrecipe.description && (
                                  <p
                                    style={{
                                      margin: "8px 0 0",
                                      fontSize: "14px",
                                      color: "#6b7280",
                                    }}
                                  >
                                    {subrecipe.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="subrecipe-body">
                              <div className="subrecipe-ingredients">
                                <em>Ingrédients :</em>
                                <ul>
                                  {(subrecipe.ingredients || []).map(
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
                                  {(subrecipe.instructions || []).map(
                                    (st, i) => (
                                      <li key={i}>{st}</li>
                                    )
                                  )}
                                </ol>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={index} className="step-item">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-text">{step}</span>
                  </li>
                );
              })}
          </ol>
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="recipe-detail-section">
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
          <div className="recipe-detail-section">
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

export default RecipeDetail;
