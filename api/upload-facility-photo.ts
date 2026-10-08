import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { level, fileName, base64Data, mimeType } = req.body || {};
    if (!level || !base64Data) {
      return res.status(400).json({ success: false, error: 'Data foto gedung tidak lengkap.' });
    }

    const validLevels = ['tk', 'sd', 'smp', 'sma'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ success: false, error: 'Jenjang pendidikan tidak valid.' });
    }

    let ext = 'jpg';
    if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/webp') ext = 'webp';
    else if (mimeType === 'image/jpeg') ext = 'jpg';
    else if (fileName) {
      const m = String(fileName).match(/\.(jpg|jpeg|png|webp)$/i);
      if (m) ext = m[1].toLowerCase();
    }

    const randomHash = Math.random().toString(36).substring(2, 8);
    const safeName = `gedung_${level}_${Date.now()}_${randomHash}.${ext}`;
    const storagePath = `schoolIdentity/education/${level}/${safeName}`;
    let downloadUrl = `/education/${level}/${safeName}`;

    // Try writing to public/education/${level} if filesystem is writable
    try {
      const targetDir = path.join(process.cwd(), 'public', 'uploads', 'schoolIdentity', 'education', level);
      const eduDir = path.join(process.cwd(), 'public', 'education', level);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      if (!fs.existsSync(eduDir)) fs.mkdirSync(eduDir, { recursive: true });

      const cleanedBase64 = String(base64Data).replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const buffer = Buffer.from(cleanedBase64, 'base64');

      fs.writeFileSync(path.join(targetDir, safeName), buffer);
      fs.writeFileSync(path.join(eduDir, safeName), buffer);
      fs.writeFileSync(path.join(eduDir, `gedung_${level}.${ext}`), buffer);
    } catch {
      // In read-only serverless environment, fallback to data URL so image is safely stored in Firestore
      downloadUrl = base64Data;
    }

    return res.status(200).json({
      success: true,
      downloadUrl,
      storagePath,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memproses unggahan foto gedung.',
    });
  }
}

