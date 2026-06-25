import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApps } from 'firebase/app';

// Get the existing Firebase app instance (initialized in firebase.js)
const app = getApps()[0];
const storage = getStorage(app);

/**
 * Compress an image file using canvas-based compression.
 * Iteratively reduces JPEG quality until the file is under maxSizeMB.
 * @param {File|Blob} file - The image file to compress
 * @param {number} maxSizeMB - Maximum file size in megabytes (default: 1)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export async function compressImage(file, maxSizeMB = 1) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // If already under the limit, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if the image is very large (max 1920px on longest side)
      const MAX_DIMENSION = 1920;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively reduce quality until under maxSizeBytes
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas compression failed'));
              return;
            }

            if (blob.size <= maxSizeBytes || quality <= 0.1) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

/**
 * Upload a photo to Firebase Storage for a specific event.
 * Automatically compresses images larger than 1MB before uploading.
 * @param {File} file - The image file to upload
 * @param {string} eventCode - The event code for organizing storage
 * @returns {Promise<string>} - The download URL of the uploaded photo
 */
export async function uploadPhoto(file, eventCode) {
  // Compress if over 1MB
  let fileToUpload = file;
  if (file.size > 1 * 1024 * 1024) {
    fileToUpload = await compressImage(file, 1);
  }

  // Sanitize filename: remove special chars, keep extension
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `vbt_events/${eventCode}/photos/${Date.now()}_${sanitizedName}`;
  const storageRef = ref(storage, storagePath);

  // Upload the file
  await uploadBytes(storageRef, fileToUpload, {
    contentType: fileToUpload.type || 'image/jpeg',
  });

  // Get and return the download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export { storage };
