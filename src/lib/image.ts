// Compression d'image côté navigateur (avant envoi à Airtable).

const MAX_DIM = 1600; // redimensionnement max (px)
const QUALITY = 0.8; // qualité JPEG

export interface CompressedImage {
  base64: string;
  contentType: string;
  filename: string;
}

export function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read error"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image error"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height >= width && height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas error"));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        const base64 = dataUrl.split(",")[1] ?? "";
        const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
        resolve({
          base64,
          contentType: "image/jpeg",
          filename: `${baseName}.jpg`,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
