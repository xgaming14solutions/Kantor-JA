import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadFacilityPhotoResult {
  downloadUrl: string;
  storagePath: string;
}

const ALLOWED_FACILITY_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

const MAX_FACILITY_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates image file type and size for education facility photos.
 */
export function validateFacilityImageFile(file: File): void {
  if (!file) {
    throw new Error('Silakan pilih file foto gedung terlebih dahulu.');
  }

  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hasValidExt = /\.(jpe?g|png|webp)$/i.test(name);

  if (!ALLOWED_FACILITY_IMAGE_MIMES.includes(mime) && !hasValidExt) {
    throw new Error('Format gambar tidak didukung. Harap gunakan file PNG, JPG, JPEG, atau WEBP.');
  }

  if (file.size > MAX_FACILITY_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Ukuran file terlalu besar (${mb} MB). Maksimal ukuran file adalah 10 MB.`);
  }
}

/**
 * Optimizes image on client-side before uploading (max width 1920px, high quality)
 * to ensure fast loading on mobile without losing high-definition details.
 */
export async function optimizeFacilityImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    // If the file is already reasonably sized (< 1.5MB), use directly
    if (file.size <= 1.5 * 1024 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1920;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.9
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a facility photo for a specific educational level (tk, sd, smp, sma) to Firebase Storage
 * and returns the permanent public download URL and storage path.
 */
export async function uploadFacilityPhotoToStorage(
  level: 'tk' | 'sd' | 'smp' | 'sma',
  file: File
): Promise<UploadFacilityPhotoResult> {
  validateFacilityImageFile(file);

  if (!storage) {
    throw new Error('Koneksi Firebase Storage tidak tersedia. Periksa konfigurasi aplikasi.');
  }

  const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = (extMatch ? extMatch[1] : file.type.split('/')[1] || 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

  const randomHash = Math.random().toString(36).substring(2, 8);
  const storagePath = `facilities/gedung_${level}_${Date.now()}_${randomHash}.${safeExt}`;
  const storageRef = ref(storage, storagePath);

  const optimizedBlob = await optimizeFacilityImage(file);
  const metadata = {
    contentType: file.type || (safeExt === 'png' ? 'image/png' : 'image/jpeg'),
    customMetadata: {
      level,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  };

  try {
    const uploadResult = await uploadBytes(storageRef, optimizedBlob, metadata);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return {
      downloadUrl,
      storagePath,
    };
  } catch (err: any) {
    console.error(`Error uploading facility photo for ${level} to Firebase Storage:`, err);
    throw new Error(
      err?.message ||
        `Gagal mengunggah foto gedung jenjang ${level.toUpperCase()} ke Firebase Storage.`
    );
  }
}

/**
 * Deletes a facility photo from Firebase Storage if path is provided.
 */
export async function deleteFacilityPhotoFromStorage(storagePath?: string): Promise<void> {
  if (!storage || !storagePath || !storagePath.startsWith('facilities/')) {
    return;
  }

  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err: any) {
    // If file already deleted or doesn't exist, ignore gracefully
    if (err?.code !== 'storage/object-not-found') {
      console.warn('Could not remove facility image from storage:', err);
    }
  }
}
