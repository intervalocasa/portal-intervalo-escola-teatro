/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeInBytes: number;
}

/**
 * Compresses and resizes an image file for fast and reliable web uploading.
 * Max dimension defaults to 1200px and JPEG quality defaults to 0.8.
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Falha ao ler o arquivo de imagem"));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("Falha ao carregar a imagem para processamento"));
      };

      img.onload = () => {
        try {
          let targetWidth = img.width;
          let targetHeight = img.height;

          // Calculate scaling ratio
          if (targetWidth > maxWidth || targetHeight > maxHeight) {
            const widthRatio = maxWidth / targetWidth;
            const heightRatio = maxHeight / targetHeight;
            const ratio = Math.min(widthRatio, heightRatio);

            targetWidth = Math.round(targetWidth * ratio);
            targetHeight = Math.round(targetHeight * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            // Fallback to original dataUrl if 2d context fails
            const dataUrl = event.target?.result as string;
            resolve({
              blob: file,
              dataUrl,
              width: img.width,
              height: img.height,
              sizeInBytes: file.size
            });
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Get Data URL (JPEG for optimal compression)
          const dataUrl = canvas.toDataURL("image/jpeg", quality);

          // Get Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  dataUrl,
                  width: targetWidth,
                  height: targetHeight,
                  sizeInBytes: blob.size
                });
              } else {
                // Fallback to base64 conversion
                const byteString = atob(dataUrl.split(",")[1]);
                const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const fallbackBlob = new Blob([ab], { type: mimeString });
                resolve({
                  blob: fallbackBlob,
                  dataUrl,
                  width: targetWidth,
                  height: targetHeight,
                  sizeInBytes: fallbackBlob.size
                });
              }
            },
            "image/jpeg",
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
