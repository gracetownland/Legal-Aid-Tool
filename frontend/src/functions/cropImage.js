// src/functions/cropImage.js

export const getCroppedImg = (imageSrc, pixelCrop, fileName = "cropped_image.png") => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Convert the canvas to a Blob and then to a File
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], fileName, { type: "image/png" });
          resolve(file); // Return as File instead of Blob URL
        } else {
          reject(new Error("Canvas is empty"));
        }
      }, "image/png");
    };
    image.onerror = reject;
  });
};
