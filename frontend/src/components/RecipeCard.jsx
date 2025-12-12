import React from "react";
import { parseRating, buildRatingStars } from "../services/recipeService";

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
          {votes ? <span className="rating-votes">({votes} avis)</span> : null}
        </>
      )}
    </div>
  );
};

const RecipeCard = ({ recipe, onClick }) => {
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  return (
    <div className="recipe-card" onClick={() => onClick(recipe)}>
      <div className="recipe-card-image">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            role="img"
            aria-label="No image available"
            style={{
              width: "100%",
              height: "100%",
              backgroundImage: "url('/miam.webp')",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundColor: "#ffffff",
              borderRadius: 8,
              overflow: "hidden",
            }}
          />
        )}
      </div>

      <div className="recipe-card-content">
        <h3 className="recipe-card-title">{recipe.name}</h3>
        <p className="recipe-card-description">{recipe.description}</p>

        <div className="recipe-card-tags">
          {recipe.tags &&
            recipe.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="recipe-tag">
                {tag}
              </span>
            ))}
        </div>

        <div className="recipe-card-meta">
          <div className="recipe-time">
            <span>Temps: </span>
            <span>{formatTime(recipe.totalTime)}</span>
          </div>
        </div>

        {(recipe.restTime > 0 ||
          recipe.chillTime > 0 ||
          recipe.freezeTime > 0) && (
          <div className="recipe-card-additional-times">
            {recipe.restTime > 0 && (
              <span className="time-badge" title="Temps de repos">
                Repos: {formatTime(recipe.restTime)}
              </span>
            )}
            {recipe.chillTime > 0 && (
              <span className="time-badge" title="Temps de réfrigération">
                Froid: {formatTime(recipe.chillTime)}
              </span>
            )}
            {recipe.freezeTime > 0 && (
              <span className="time-badge" title="Temps de congélation">
                Surgelé: {formatTime(recipe.freezeTime)}
              </span>
            )}
          </div>
        )}

        {renderRating(recipe.rating)}
      </div>
    </div>
  );
};

export default RecipeCard;
