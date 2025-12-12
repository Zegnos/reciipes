import React, { useState } from "react";

const NoteImageThumbnails = ({
  images,
  onImageClick,
  onImageDelete,
  isEditing = false,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDeleteClick = (e, imageId) => {
    e.stopPropagation();
    setDeleteConfirm(imageId);
  };

  const confirmDelete = (imageId) => {
    onImageDelete(imageId);
    setDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="note-image-thumbnails">
      <div className="thumbnails-grid">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="thumbnail-item"
            onClick={() => onImageClick(index)}
            title={`Cliquer pour agrandir • ${image.original_filename}`}
          >
            <img
              src={image.image_url}
              alt={`Image ${index + 1}`}
              className="thumbnail-image"
              loading="lazy"
            />

            {isEditing && (
              <button
                type="button"
                className="thumbnail-delete-btn"
                onClick={(e) => handleDeleteClick(e, image.id)}
                title="Supprimer cette image"
              >
                X
              </button>
            )}

            <div className="thumbnail-overlay">
              <span className="thumbnail-zoom-icon">Zoom</span>
            </div>
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <div className="mini-delete-confirm" onClick={cancelDelete}>
          <div
            className="mini-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <p>Supprimer cette image ?</p>
            <div className="mini-delete-actions">
              <button
                type="button"
                className="btn btn-small btn-secondary"
                onClick={cancelDelete}
              >
                Non
              </button>
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={() => confirmDelete(deleteConfirm)}
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteImageThumbnails;
