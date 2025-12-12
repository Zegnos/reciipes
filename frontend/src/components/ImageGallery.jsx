import React, { useState, useEffect, useRef } from "react";

const ImageGallery = ({ images, initialIndex = 0, onClose, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const galleryRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  useEffect(() => {
    if (galleryRef.current) {
      galleryRef.current.focus();
    }
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && images.length > 1) {
      goToNext();
    }
    if (isRightSwipe && images.length > 1) {
      goToPrevious();
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    const imageToDelete = images[currentIndex];
    onDelete(imageToDelete.id);
    setShowDeleteConfirm(false);

    if (images.length === 1) {
      onClose();
    } else if (currentIndex === images.length - 1) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="image-gallery-overlay" onClick={onClose}>
      <div
        className="image-gallery"
        ref={galleryRef}
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gallery-header">
          <div className="gallery-info">
            <span className="image-counter">
              {currentIndex + 1} / {images.length}
            </span>
            <span className="image-name">{currentImage.original_filename}</span>
          </div>
          <div className="gallery-actions">
            <button
              type="button"
              className="gallery-btn delete-btn"
              onClick={handleDelete}
              title="Supprimer cette image"
            >
              Supprimer
            </button>
            <button
              type="button"
              className="gallery-btn close-btn"
              onClick={onClose}
              title="Fermer (Echap)"
            >
              X
            </button>
          </div>
        </div>

        <div
          className="gallery-main"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {images.length > 1 && (
            <button
              type="button"
              className="gallery-nav prev-btn"
              onClick={goToPrevious}
              title="Image précédente (←)"
            >
              ←
            </button>
          )}

          <div className="gallery-image-container">
            <img
              src={currentImage.image_url}
              alt={currentImage.original_filename}
              className="gallery-image"
              loading="lazy"
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              className="gallery-nav next-btn"
              onClick={goToNext}
              title="Image suivante (→)"
            >
              →
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="gallery-thumbnails">
            <div className="thumbnails-container">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image.id}
                  className={`thumbnail ${
                    index === currentIndex ? "active" : ""
                  }`}
                  onClick={() => goToImage(index)}
                >
                  <img
                    src={image.image_url}
                    alt={`Miniature ${index + 1}`}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="swipe-indicator">
          <span>← Swipe →</span>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={cancelDelete}>
          <div
            className="delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Supprimer cette image ?</h3>
            <p>Cette action est irréversible.</p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelDelete}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
