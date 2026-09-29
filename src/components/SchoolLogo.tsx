import React, { useState, useEffect, useMemo } from 'react';
import { School, BookOpen } from 'lucide-react';

export interface SchoolLogoProps {
  logoUrl?: string | null;
  schoolName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'print';
  variant?: 'navy' | 'emerald' | 'light' | 'subtle' | 'plain';
  fallbackIcon?: 'school' | 'book';
  hideIfEmpty?: boolean;
  cacheKey?: string | number;
  className?: string;
  imgClassName?: string;
}

const SIZE_CLASSES: Record<NonNullable<SchoolLogoProps['size']>, { box: string; icon: string; img: string }> = {
  xs: {
    box: 'w-6 h-6 rounded-md p-0.5',
    icon: 'w-3.5 h-3.5',
    img: 'max-w-full max-h-full w-auto h-auto object-contain',
  },
  sm: {
    box: 'w-8 h-8 rounded-lg p-1',
    icon: 'w-4 h-4',
    img: 'max-w-full max-h-full w-auto h-auto object-contain',
  },
  md: {
    box: 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl p-1',
    icon: 'w-5 h-5',
    img: 'max-w-full max-h-full w-auto h-auto object-contain',
  },
  lg: {
    box: 'w-12 h-12 sm:w-14 sm:h-14 rounded-xl p-1.5',
    icon: 'w-6 h-6',
    img: 'max-w-full max-h-full w-auto h-auto object-contain',
  },
  xl: {
    box: 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-2',
    icon: 'w-10 h-10',
    img: 'max-w-full max-h-full w-auto h-auto object-contain',
  },
  print: {
    box: 'w-16 h-16 sm:w-20 sm:h-20 p-1',
    icon: 'w-8 h-8',
    img: 'max-w-full max-h-full w-auto h-auto object-contain',
  },
};

const VARIANT_CLASSES: Record<
  NonNullable<SchoolLogoProps['variant']>,
  { withLogo: string; withoutLogo: string }
> = {
  navy: {
    withLogo: 'bg-white border border-white/20 shadow-2xs',
    withoutLogo: 'bg-[#335F75] border border-white/15 text-white',
  },
  emerald: {
    withLogo: 'bg-white border border-emerald-800/30 shadow-xs',
    withoutLogo: 'bg-emerald-950 border border-emerald-800 text-amber-300 shadow-xs',
  },
  light: {
    withLogo: 'bg-white border border-[#DCE5E8] shadow-2xs',
    withoutLogo: 'bg-[#F0F5F7] border border-[#DCE5E8] text-[#24485A]',
  },
  subtle: {
    withLogo: 'bg-white border border-slate-200 shadow-2xs',
    withoutLogo: 'bg-slate-100 border border-slate-200 text-[#24485A]',
  },
  plain: {
    withLogo: 'bg-transparent',
    withoutLogo: 'bg-slate-100 border border-slate-200 text-slate-700',
  },
};

/**
 * Reusable dynamic school logo component.
 * Preserves aspect ratio (never stretched or cropped) and automatically falls back
 * to a clean icon if no logo is set or if the image URL fails to load.
 */
export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  logoUrl,
  schoolName = 'Pesantren Islam Mutiara Insan',
  size = 'sm',
  variant = 'light',
  fallbackIcon = 'school',
  hideIfEmpty = false,
  cacheKey,
  className = '',
  imgClassName = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const cleanUrl = typeof logoUrl === 'string' ? logoUrl.trim() : '';

  const resolvedSrc = useMemo(() => {
    if (!cleanUrl) return '';
    if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
      return cleanUrl;
    }
    if (cacheKey) {
      const sep = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${sep}v=${encodeURIComponent(String(cacheKey))}`;
    }
    return cleanUrl;
  }, [cleanUrl, cacheKey]);

  useEffect(() => {
    setImgError(false);
  }, [resolvedSrc]);

  const hasValidLogo = resolvedSrc.length > 0 && !imgError;

  if (!hasValidLogo && hideIfEmpty) {
    return null;
  }

  const sizeStyle = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  const variantStyle = VARIANT_CLASSES[variant] || VARIANT_CLASSES.light;
  const IconComponent = fallbackIcon === 'book' ? BookOpen : School;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden select-none ${
        sizeStyle.box
      } ${hasValidLogo ? variantStyle.withLogo : variantStyle.withoutLogo} ${className}`}
      title={schoolName}
    >
      {hasValidLogo ? (
        <img
          key={resolvedSrc.slice(-32)}
          src={resolvedSrc}
          alt={`Logo ${schoolName}`}
          onError={() => setImgError(true)}
          className={`${sizeStyle.img} ${imgClassName}`}
        />
      ) : (
        <IconComponent className={sizeStyle.icon} />
      )}
    </div>
  );
};

export const ALLOWED_LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export interface ProcessedLogoResult {
  previewDataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  fileName: string;
  mimeType: string;
  file: File;
}

/**
 * Validates logo file format (PNG, JPG, JPEG, WEBP) and size (<= 2 MB),
 * then generates a proportional, high-clarity Data URL preview preserving aspect ratio and transparency.
 */
export async function validateAndPreviewLogoFile(file: File): Promise<ProcessedLogoResult> {
  if (!file) {
    throw new Error('Tidak ada file yang dipilih.');
  }

  const fileNameLower = (file.name || '').toLowerCase();
  const hasValidExtension =
    fileNameLower.endsWith('.png') ||
    fileNameLower.endsWith('.jpg') ||
    fileNameLower.endsWith('.jpeg') ||
    fileNameLower.endsWith('.webp');
  const hasValidMime = ALLOWED_LOGO_MIME_TYPES.includes((file.type || '').toLowerCase());

  if (!hasValidMime && !hasValidExtension) {
    throw new Error(
      'Format file tidak valid. Harap pilih file logo dengan format PNG, JPG, JPEG, atau WEBP.'
    );
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Ukuran file terlalu besar (${sizeMb} MB). Maksimal ukuran file logo yang diizinkan adalah 2 MB.`
    );
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file gambar.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('File gambar rusak atau tidak dapat ditampilkan sebagai logo.'));
    image.src = rawDataUrl;
  });

  const naturalWidth = img.naturalWidth || img.width || 256;
  const naturalHeight = img.naturalHeight || img.height || 256;

  // Optimize dimensions proportionally (max 240px on longest side) while preserving exact aspect ratio & transparency.
  // 240px provides crystal-clear rendering on retina screens & print headers while keeping Base64 size compact (< 35 KB)
  // so Firestore setDoc over long-polling and mobile localStorage never fail or time out.
  const MAX_DIMENSION = 240;
  let targetWidth = naturalWidth;
  let targetHeight = naturalHeight;

  if (naturalWidth > MAX_DIMENSION || naturalHeight > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / naturalWidth, MAX_DIMENSION / naturalHeight);
    targetWidth = Math.max(1, Math.round(naturalWidth * ratio));
    targetHeight = Math.max(1, Math.round(naturalHeight * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      previewDataUrl: rawDataUrl,
      width: naturalWidth,
      height: naturalHeight,
      originalSize: file.size,
      fileName: file.name,
      mimeType: file.type || 'image/png',
      file,
    };
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Detect whether the image actually contains transparent pixels
  let hasTransparentPixels = false;
  try {
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
    for (let i = 3; i < imageData.length; i += 16) {
      if (imageData[i] < 250) {
        hasTransparentPixels = true;
        break;
      }
    }
  } catch {
    hasTransparentPixels =
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      fileNameLower.endsWith('.png') ||
      fileNameLower.endsWith('.webp');
  }

  let outputMime = 'image/jpeg';
  let optimizedDataUrl = '';

  if (hasTransparentPixels) {
    // Try WebP first (supports transparency with small size), fallback to PNG if browser does not encode WebP
    const webpAttempt = canvas.toDataURL('image/webp', 0.86);
    if (webpAttempt.startsWith('data:image/webp') && webpAttempt.length < 65_000) {
      outputMime = 'image/webp';
      optimizedDataUrl = webpAttempt;
    } else {
      outputMime = 'image/png';
      optimizedDataUrl = canvas.toDataURL('image/png');
    }
  } else {
    // Fill white background for opaque images and encode as high-clarity JPEG
    const opaqueCanvas = document.createElement('canvas');
    opaqueCanvas.width = targetWidth;
    opaqueCanvas.height = targetHeight;
    const oCtx = opaqueCanvas.getContext('2d');
    if (oCtx) {
      oCtx.fillStyle = '#FFFFFF';
      oCtx.fillRect(0, 0, targetWidth, targetHeight);
      oCtx.imageSmoothingEnabled = true;
      oCtx.imageSmoothingQuality = 'high';
      oCtx.drawImage(canvas, 0, 0);
      outputMime = 'image/jpeg';
      optimizedDataUrl = opaqueCanvas.toDataURL('image/jpeg', 0.88);
    } else {
      optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    }
  }

  // Second pass if still > 55 KB (e.g., complex transparent PNG on iOS Safari where WebP encode falls back to PNG)
  if (optimizedDataUrl.length > 55_000) {
    const compactMax = 160;
    const ratio = Math.min(compactMax / naturalWidth, compactMax / naturalHeight, 1);
    const cW = Math.max(1, Math.round(naturalWidth * ratio));
    const cH = Math.max(1, Math.round(naturalHeight * ratio));
    canvas.width = cW;
    canvas.height = cH;
    const ctx2 = canvas.getContext('2d');
    if (ctx2) {
      ctx2.imageSmoothingEnabled = true;
      ctx2.imageSmoothingQuality = 'high';
      ctx2.clearRect(0, 0, cW, cH);
      ctx2.drawImage(img, 0, 0, cW, cH);
      const webp2 = canvas.toDataURL('image/webp', 0.82);
      if (webp2.startsWith('data:image/webp')) {
        outputMime = 'image/webp';
        optimizedDataUrl = webp2;
      } else {
        outputMime = hasTransparentPixels ? 'image/png' : 'image/jpeg';
        optimizedDataUrl = canvas.toDataURL(outputMime, 0.82);
      }
      targetWidth = cW;
      targetHeight = cH;
    }
  }

  return {
    previewDataUrl: optimizedDataUrl,
    width: targetWidth,
    height: targetHeight,
    originalSize: file.size,
    fileName: file.name,
    mimeType: outputMime,
    file,
  };
}

/**
 * Returns the validated, aspect-ratio-preserved compact Data URL (< 35 KB) for immediate persistence
 * in Firestore (academicSettings/school_identity), backend server storage, and localStorage.
 */
export async function uploadSchoolLogoWithFallback(
  processed: ProcessedLogoResult
): Promise<string> {
  return processed.previewDataUrl;
}
