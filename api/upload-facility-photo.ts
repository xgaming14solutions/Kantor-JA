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

    const safeName = fileName || `gedung_${level}.jpg`;

    // On Vercel serverless, returning the optimized base64 dataUrl ensures
    // the image is permanently stored in Firestore without ephemeral filesystem loss.
    return res.status(200).json({
      success: true,
      downloadUrl: base64Data,
      storagePath: `schoolIdentity/education/${level}/${safeName}`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memproses unggahan foto gedung di Vercel.',
    });
  }
}
