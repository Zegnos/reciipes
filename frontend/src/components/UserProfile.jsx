import React, { useState, useEffect } from "react";

const UserProfile = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setIsOpen(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch("/api/user/delete-all-data", {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        alert("Toutes vos données ont été supprimées.");
        window.location.href = "/";
      } else {
        alert("Erreur lors de la suppression des données.");
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error("Error deleting data:", error);
      alert("Erreur lors de la suppression des données.");
      setShowDeleteModal(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="user-profile">
        <div className="user-avatar" onClick={() => setIsOpen(!isOpen)}>
          <img src={user.avatar_url} alt={user.name} />
          <span className="user-name">{user.name.split(" ")[0]}</span>
          <svg className="dropdown-arrow" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>

        {isOpen && (
          <div className="user-dropdown">
            <div className="user-info">
              <img src={user.avatar_url} alt={user.name} />
              <div>
                <div className="user-full-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
            <hr />
            <button onClick={onLogout} className="logout-btn">
              <svg viewBox="0 0 24 24">
                <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z" />
              </svg>
              Se déconnecter
            </button>
            <button onClick={handleDeleteClick} className="delete-data-btn">
              Supprimer mes données
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="delete-modal-backdrop" onClick={handleBackdropClick}>
          <div className="delete-modal">
            <div className="delete-modal-icon">⚠️</div>
            <h2 className="delete-modal-title">
              Êtes-vous sûr de vouloir supprimer toutes vos données ?
            </h2>
            <p className="delete-modal-text">
              Cette action est irréversible. Toutes vos recettes, images et
              données personnelles seront définitivement supprimées.
            </p>
            <div className="delete-modal-actions">
              <button
                onClick={handleCancelDelete}
                className="modal-btn modal-btn-cancel"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                className="modal-btn modal-btn-danger"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfile;
