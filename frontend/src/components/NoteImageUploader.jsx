import React, { useState, useRef } from "react";

const NoteImageUploader = ({
  recipeId,
  onImageUploaded,
  currentImageCount = 0,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const maxImages = 10;
  const remainingSlots = maxImages - currentImageCount;

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && remainingSlots > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || remainingSlots <= 0) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length > 0) {
      const filesToUpload = imageFiles.slice(0, remainingSlots);
      uploadFiles(filesToUpload);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length > 0) {
      const filesToUpload = imageFiles.slice(0, remainingSlots);
      uploadFiles(filesToUpload);
    }

    e.target.value = "";
  };

  const uploadFiles = async (files) => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        await uploadSingleFile(file);
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      alert("Erreur lors de l'upload des images");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSingleFile = async (file) => {
    if (!recipeId) {
      await uploadTempFile(file);
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`/api/recipes/${recipeId}/note-images`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'upload");
    }

    const result = await response.json();
    onImageUploaded(result);
  };

  const uploadTempFile = async (file) => {
    const tempImage = {
      id: `temp_${Date.now()}_${Math.random()}`,
      file: file,
      image_url: URL.createObjectURL(file),
      original_filename: file.name,
      isTemporary: true,
    };

    onImageUploaded(tempImage);
  };

  const handleZoneClick = () => {
    if (!disabled && remainingSlots > 0) {
      fileInputRef.current?.click();
    }
  };

  const handlePaste = async (e) => {
    if (disabled || remainingSlots <= 0) return;

    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        await uploadFiles([file]);
      }
    }
  };

  if (disabled || remainingSlots <= 0) {
    return (
      <div className="note-image-uploader">
        <div className="uploader-disabled">
          <p>
            {remainingSlots <= 0
              ? `Maximum de ${maxImages} images atteint`
              : "Upload désactivé"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="note-image-uploader">
      {remainingSlots > 0 && (
        <div
          className={`upload-zone ${isDragging ? "dragging" : ""} ${
            disabled ? "disabled" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onClick={handleZoneClick}
          tabIndex={0}
        >
          {isUploading ? (
            <div className="upload-status">
              <div className="upload-spinner"></div>
              <p>Upload en cours...</p>
            </div>
          ) : (
            <div className="upload-content">
              <div className="upload-icon">Upload</div>
              <p>Glissez vos images ici ou cliquez pour sélectionner</p>
              <p className="upload-hint">
                Ctrl+V pour coller une capture d'écran • {remainingSlots} images
                restantes
              </p>
            </div>
          )}
        </div>
      )}

      {remainingSlots <= 0 && (
        <div className="upload-limit-reached">
          <p>Limite de {maxImages} images atteinte</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default NoteImageUploader;
