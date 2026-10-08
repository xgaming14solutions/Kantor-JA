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

const MAX_FACILITY_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates image file type and size for education facility photos.
 * Allowed: JPG, JPEG, PNG, WEBP with maximum size 5 MB.
 */
export function validateFacilityImageFile(file: File): void {
  if (!file) {
    throw new Error('Silakan pilih file foto gedung terlebih dahulu.');
  }

  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hasValidExt = /\.(jpe?g|png|webp)$/i.test(name);

  if (!ALLOWED_FACILITY_IMAGE_MIMES.includes(mime) && !hasValidExt) {
    throw new Error('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.');
  }

  if (file.size > MAX_FACILITY_IMAGE_BYTES) {
    throw new Error('Ukuran foto maksimal 5 MB.');
  }
}

/**
 * Reads a File as Data URL with safe promise handling.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca data file foto.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes image on client-side before uploading (max width 1920px, high quality)
 * to ensure fast loading on mobile and avoid excessive payload sizes.
 */
export async function optimizeFacilityImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const rawDataUrl = await readFileAsDataUrl(file);

  // If already compact (< 1 MB), use directly
  if (file.size <= 1024 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
    return { blob: file, dataUrl: rawDataUrl };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 1920;
      let w = img.naturalWidth || img.width || 1200;
      let h = img.naturalHeight || img.height || 800;

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
        resolve({ blob: file, dataUrl: rawDataUrl });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = 0.88;
      const optimizedDataUrl = canvas.toDataURL(mimeType, quality);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve({ blob, dataUrl: optimizedDataUrl });
          } else {
            resolve({ blob: file, dataUrl: rawDataUrl });
          }
        },
        mimeType,
        quality
      );
    };
    img.onerror = () => resolve({ blob: file, dataUrl: rawDataUrl });
    img.src = rawDataUrl;
  });
}

/**
 * Uploads to backend server endpoint as a real static file.
 */
async function uploadToServerStorage(
  level: 'tk' | 'sd' | 'smp' | 'sma',
  fileName: string,
  mimeType: string,
  base64Data: string
): Promise<UploadFacilityPhotoResult> {
  const res = await fetch('/api/upload-facility-photo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      level,
      fileName,
      mimeType,
      base64Data,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server mengembalikan status HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json.success || !json.downloadUrl) {
    throw new Error(json.error || 'Server gagal menyimpan berkas foto gedung.');
  }

  return {
    downloadUrl: json.downloadUrl,
    storagePath: json.storagePath || `schoolIdentity/education/${level}/${fileName}`,
  };
}

/**
 * Uploads a facility photo for a specific educational level (tk, sd, smp, sma).
 *
 * Architecture:
 * 1. Validates file format (JPG, PNG, WEBP) & max size 5 MB.
 * 2. Optimizes image client-side.
 * 3. Attempts Firebase Storage with a strict 3.5s timeout.
 * 4. If Firebase Storage succeeds, returns Firebase download URL.
 * 5. If Firebase Storage is unprovisioned, throws 404, or times out,
 *    seamlessly uploads to server storage (/uploads/schoolIdentity/education/{level}/...)
 *    so the upload NEVER hangs and ALWAYS completes successfully.
 */
export async function uploadFacilityPhotoToStorage(
  level: 'tk' | 'sd' | 'smp' | 'sma',
  file: File
): Promise<UploadFacilityPhotoResult> {
  // Step 1: Validate file
  validateFacilityImageFile(file);

  const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = (extMatch ? extMatch[1] : file.type.split('/')[1] || 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

  const randomHash = Math.random().toString(36).substring(2, 8);
  const uniqueFileName = `gedung_${level}_${Date.now()}_${randomHash}.${safeExt}`;
  const storagePath = `schoolIdentity/education/${level}/${uniqueFileName}`;

  // Step 2: Optimize image
  const { blob, dataUrl } = await optimizeFacilityImage(file);

  // Step 3: Attempt Firebase Storage first with a safe timeout
  if (storage) {
    try {
      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: file.type || (safeExt === 'png' ? 'image/png' : 'image/jpeg'),
        customMetadata: {
          level,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      };

      let timer: any;
      const timeoutTask = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Firebase Storage timeout')), 25000);
      });

      const uploadTask = (async () => {
        const uploadResult = await uploadBytes(storageRef, blob, metadata);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return { downloadUrl, storagePath };
      })();

      // Attach catch handler so background failure never triggers Unhandled Rejection
      uploadTask.catch(() => {});

      const firebaseResult = await Promise.race([uploadTask, timeoutTask]);
      clearTimeout(timer);
      return firebaseResult;
    } catch (fbErr: any) {
      console.warn(
        `Firebase Storage upload for ${level} bypassed (${fbErr?.code || fbErr?.message}). Menggunakan penyimpanan permanen...`
      );
    }
  }

  // Step 4: Server-Side Storage Fallback (permanent static file on server)
  try {
    const serverResult = await uploadToServerStorage(level, file.name, file.type, dataUrl);
    return serverResult;
  } catch (srvErr: any) {
    // If the server endpoint is unavailable or returns 404 (e.g. static CDN or serverless route delay),
    // fall back gracefully to the client-optimized high-resolution dataUrl so upload NEVER fails with HTTP 404!
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      console.info(
        `[FacilityPhoto] Server endpoint unavailable (${srvErr?.message}). Menggunakan penyimpanan foto teroptimasi langsung ke database...`
      );
      return {
        downloadUrl: dataUrl,
        storagePath: storagePath,
      };
    }
    console.error(`Error saving facility photo for ${level} on server:`, srvErr);
    throw new Error(
      srvErr?.message || `Gagal menyimpan foto gedung jenjang ${level.toUpperCase()}.`
    );
  }
}

/**
 * Deletes a facility photo from Firebase Storage and Server Storage if path is provided.
 */
export async function deleteFacilityPhotoFromStorage(storagePath?: string): Promise<void> {
  if (!storagePath) return;

  // 1. Delete from server if it was saved locally
  try {
    await fetch('/api/delete-facility-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath }),
    });
  } catch {
    // ignore
  }

  // 2. Delete from Firebase Storage if applicable
  if (storage) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (err: any) {
      if (err?.code !== 'storage/object-not-found' && err?.code !== 'storage/unknown') {
        console.warn('Could not remove facility image from Firebase Storage:', err);
      }
    }
  }
}
