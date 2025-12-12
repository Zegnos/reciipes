import React, { useState, useRef, useCallback, useEffect } from "react";

const ImageCropper = ({ imageFile, onCrop, onCancel }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState({
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [scale, setScale] = useState(1);
  const [maxDimensions, setMaxDimensions] = useState({
    width: 300,
    height: 300,
  });

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const containerWidth = Math.min(window.innerWidth - 40, 400);
          const containerHeight = Math.min(window.innerHeight - 200, 400);

          let displayWidth = img.width;
          let displayHeight = img.height;

          if (
            displayWidth > containerWidth ||
            displayHeight > containerHeight
          ) {
            const scaleW = containerWidth / displayWidth;
            const scaleH = containerHeight / displayHeight;
            const scaleToUse = Math.min(scaleW, scaleH);

            displayWidth = displayWidth * scaleToUse;
            displayHeight = displayHeight * scaleToUse;
          }

          setImageDimensions({ width: displayWidth, height: displayHeight });
          setMaxDimensions({ width: displayWidth, height: displayHeight });

          const initialSize = Math.min(displayWidth, displayHeight) * 0.8;
          setCropArea({
            x: (displayWidth - initialSize) / 2,
            y: (displayHeight - initialSize) / 2,
            width: initialSize,
            height: initialSize,
          });

          imageRef.current = img;
          setImageLoaded(true);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        const containerWidth = Math.min(window.innerWidth - 40, 400);
        const containerHeight = Math.min(window.innerHeight - 200, 400);

        let displayWidth = imageRef.current.width;
        let displayHeight = imageRef.current.height;

        if (displayWidth > containerWidth || displayHeight > containerHeight) {
          const scaleW = containerWidth / displayWidth;
          const scaleH = containerHeight / displayHeight;
          const scaleToUse = Math.min(scaleW, scaleH);

          displayWidth = displayWidth * scaleToUse;
          displayHeight = displayHeight * scaleToUse;
        }

        setImageDimensions({ width: displayWidth, height: displayHeight });
        setMaxDimensions({ width: displayWidth, height: displayHeight });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [imageLoaded]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas || !imageRef.current || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;

    ctx.drawImage(
      imageRef.current,
      0,
      0,
      imageDimensions.width,
      imageDimensions.height
    );

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    ctx.globalCompositeOperation = "source-over";

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    const cornerSize = 20;
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      cropArea.x + cropArea.width - cornerSize / 2,
      cropArea.y + cropArea.height - cornerSize / 2,
      cornerSize,
      cornerSize
    );
  }, [cropArea, imageDimensions, imageLoaded]);

  useEffect(() => {
    if (imageLoaded && canvasRef.current) {
      setTimeout(() => {
        drawCanvas();
      }, 10);
    }
  }, [drawCanvas, imageLoaded]);

  const getEventPos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const isInCropArea = (pos) => {
    return (
      pos.x >= cropArea.x &&
      pos.x <= cropArea.x + cropArea.width &&
      pos.y >= cropArea.y &&
      pos.y <= cropArea.y + cropArea.height
    );
  };

  const isInResizeCorner = (pos) => {
    const cornerSize = 20;
    return (
      pos.x >= cropArea.x + cropArea.width - cornerSize / 2 &&
      pos.x <= cropArea.x + cropArea.width + cornerSize / 2 &&
      pos.y >= cropArea.y + cropArea.height - cornerSize / 2 &&
      pos.y <= cropArea.y + cropArea.height + cornerSize / 2
    );
  };

  const handleStart = (e) => {
    e.preventDefault();
    const pos = getEventPos(e);

    setIsDragging(true);
    setDragStart(pos);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const pos = getEventPos(e);
    const deltaX = pos.x - dragStart.x;
    const deltaY = pos.y - dragStart.y;

    if (isInResizeCorner(dragStart)) {
      const newWidth = Math.max(
        50,
        Math.min(cropArea.width + deltaX, maxDimensions.width - cropArea.x)
      );
      const newHeight = Math.max(
        50,
        Math.min(cropArea.height + deltaY, maxDimensions.height - cropArea.y)
      );

      setCropArea((prev) => ({
        ...prev,
        width: newWidth,
        height: newHeight,
      }));
    } else if (isInCropArea(dragStart)) {
      const newX = Math.max(
        0,
        Math.min(cropArea.x + deltaX, maxDimensions.width - cropArea.width)
      );
      const newY = Math.max(
        0,
        Math.min(cropArea.y + deltaY, maxDimensions.height - cropArea.height)
      );

      setCropArea((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    }

    setDragStart(pos);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleCropConfirm = () => {
    if (!imageRef.current || !imageLoaded) {
      console.error("Image not loaded yet");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const ratioX = imageRef.current.width / imageDimensions.width;
    const ratioY = imageRef.current.height / imageDimensions.height;

    const cropX = cropArea.x * ratioX;
    const cropY = cropArea.y * ratioY;
    const cropWidth = cropArea.width * ratioX;
    const cropHeight = cropArea.height * ratioY;

    const maxOutputSize = 800;
    let outputWidth = cropWidth;
    let outputHeight = cropHeight;

    if (cropWidth > maxOutputSize || cropHeight > maxOutputSize) {
      const scale = maxOutputSize / Math.max(cropWidth, cropHeight);
      outputWidth = cropWidth * scale;
      outputHeight = cropHeight * scale;
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.drawImage(
      imageRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    canvas.toBlob(
      (blob) => {
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type || "image/jpeg",
          lastModified: Date.now(),
        });
        onCrop(croppedFile);
      },
      imageFile.type || "image/jpeg",
      0.9
    );
  };

  if (!imageLoaded) {
    return (
      <div className="image-cropper-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de l'image...</p>
      </div>
    );
  }

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-container">
        <div className="image-cropper-header">
          <h3>Recadrer l'image</h3>
          <p>Déplacez et redimensionnez la zone de sélection</p>
        </div>

        <div className="image-cropper-canvas-container">
          <canvas
            ref={canvasRef}
            className="image-cropper-canvas"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>

        <div className="image-cropper-controls">
          <button className="btn-cancel" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn-confirm" onClick={handleCropConfirm}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
