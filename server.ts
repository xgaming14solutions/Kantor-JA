import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createAuthUserViaFirebase,
  rollbackAuthUser,
  sendPasswordResetViaApi,
} from './src/server/adminAuthService.ts';

const SCHOOL_IDENTITY_STORAGE_DIR = path.join(process.cwd(), 'public', 'uploads');
const SCHOOL_IDENTITY_FILE_PATH = path.join(SCHOOL_IDENTITY_STORAGE_DIR, 'school-identity-runtime.json');

function readPersistedSchoolIdentity(): Record<string, any> | null {
  try {
    if (fs.existsSync(SCHOOL_IDENTITY_FILE_PATH)) {
      const raw = fs.readFileSync(SCHOOL_IDENTITY_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read persisted school-identity-runtime.json:', err);
  }
  return null;
}

function writePersistedSchoolIdentity(data: Record<string, any>): void {
  try {
    if (!fs.existsSync(SCHOOL_IDENTITY_STORAGE_DIR)) {
      fs.mkdirSync(SCHOOL_IDENTITY_STORAGE_DIR, { recursive: true });
    }
    const existing = readPersistedSchoolIdentity();
    const merged = { ...(existing || {}), ...data };
    // Never overwrite a non-empty logoUrl with an empty string unless logoRemoved is explicitly true
    if (!merged.logoUrl && existing?.logoUrl && data.logoRemoved !== true) {
      merged.logoUrl = existing.logoUrl;
      merged.logoUpdatedAt = existing.logoUpdatedAt || existing.updatedAt;
    }
    fs.writeFileSync(SCHOOL_IDENTITY_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write persisted school-identity-runtime.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Serve static uploaded & public assets (including education facility photos)
  app.use('/education', express.static(path.join(process.cwd(), 'public', 'education'), {
    maxAge: '1d',
    etag: true,
  }));
  if (fs.existsSync(path.join(process.cwd(), 'dist', 'education'))) {
    app.use('/education', express.static(path.join(process.cwd(), 'dist', 'education'), {
      maxAge: '1d',
      etag: true,
    }));
  }

  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), {
    maxAge: '1d',
    etag: true,
  }));

  app.use(express.static(path.join(process.cwd(), 'public'), {
    maxAge: '1d',
    etag: true,
  }));

  // Serve public SEO assets (robots.txt, sitemap.xml, Open Graph image)
  app.get('/robots.txt', (req, res) => {
    const publicRobots = path.join(process.cwd(), 'public', 'robots.txt');
    const distRobots = path.join(process.cwd(), 'dist', 'robots.txt');
    const targetFile = fs.existsSync(publicRobots) ? publicRobots : distRobots;
    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.sendFile(targetFile);
  });

  app.get('/sitemap.xml', (req, res) => {
    const publicSitemap = path.join(process.cwd(), 'public', 'sitemap.xml');
    const distSitemap = path.join(process.cwd(), 'dist', 'sitemap.xml');
    const targetFile = fs.existsSync(publicSitemap) ? publicSitemap : distSitemap;
    res.status(200);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.sendFile(targetFile);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'KantoJA Server' });
  });

  // Persistent School Identity & Logo endpoints (synchronized with Firestore academicSettings/school_identity)
  app.get('/api/school-identity', (req, res) => {
    const stored = readPersistedSchoolIdentity();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.json({ success: true, data: stored });
  });

  app.post('/api/school-identity', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Payload identitas sekolah tidak valid.' });
      }
      writePersistedSchoolIdentity(payload);
      return res.json({ success: true, data: payload });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Gagal menyimpan identitas sekolah di server.',
      });
    }
  });

  // Facility photo upload endpoint (saves file permanently to public/uploads/schoolIdentity/education/{level})
  app.post(['/api/upload-facility-photo', '/api/upload-facility-photo/'], (req, res) => {
    try {
      const { level, fileName, base64Data, mimeType } = req.body;
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
        const m = fileName.match(/\.(jpg|jpeg|png|webp)$/i);
        if (m) ext = m[1].toLowerCase();
      }

      const targetDir = path.join(process.cwd(), 'public', 'uploads', 'schoolIdentity', 'education', level);
      const eduDir = path.join(process.cwd(), 'public', 'education', level);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      if (!fs.existsSync(eduDir)) {
        fs.mkdirSync(eduDir, { recursive: true });
      }

      const randomHash = Math.random().toString(36).substring(2, 8);
      const safeFileName = `gedung_${level}_${Date.now()}_${randomHash}.${ext}`;
      const filePath = path.join(targetDir, safeFileName);
      const eduFilePath = path.join(eduDir, safeFileName);
      const canonicalEduPath = path.join(eduDir, `gedung_${level}.${ext}`);

      const cleanedBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const buffer = Buffer.from(cleanedBase64, 'base64');

      fs.writeFileSync(filePath, buffer);
      fs.writeFileSync(eduFilePath, buffer);
      fs.writeFileSync(canonicalEduPath, buffer);

      // Also copy to dist if dist exists (e.g., production build)
      const distEduDir = path.join(process.cwd(), 'dist', 'education', level);
      if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
        if (!fs.existsSync(distEduDir)) {
          fs.mkdirSync(distEduDir, { recursive: true });
        }
        fs.writeFileSync(path.join(distEduDir, safeFileName), buffer);
        fs.writeFileSync(path.join(distEduDir, `gedung_${level}.${ext}`), buffer);
      }

      const downloadUrl = `/education/${level}/${safeFileName}`;
      const storagePath = `schoolIdentity/education/${level}/${safeFileName}`;

      // Synchronize in runtime JSON
      try {
        const existing = readPersistedSchoolIdentity() || {};
        const ef = existing.educationFacilities || {};
        const curLevel = ef[level] || {};
        const updatedLevel = {
          ...curLevel,
          imageUrl: downloadUrl,
          storagePath: storagePath,
          updatedAt: new Date().toISOString(),
        };
        writePersistedSchoolIdentity({
          educationFacilities: {
            ...ef,
            [level]: updatedLevel,
          },
        });
      } catch {
        // ignore background json sync
      }

      return res.json({
        success: true,
        downloadUrl,
        storagePath,
      });
    } catch (err: any) {
      console.error('Error saving facility photo on server:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Gagal menyimpan foto gedung di server.',
      });
    }
  });

  // Facility photo delete endpoint
  app.post(['/api/delete-facility-photo', '/api/delete-facility-photo/'], (req, res) => {
    try {
      const { storagePath } = req.body;
      if (storagePath && typeof storagePath === 'string' && storagePath.startsWith('schoolIdentity/education/')) {
        const safePath = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
        const targetUploads = path.join(process.cwd(), 'public', 'uploads', safePath);
        const subRel = safePath.replace(/^schoolIdentity\/education\//, '');
        const targetEdu = path.join(process.cwd(), 'public', 'education', subRel);
        const targetDistEdu = path.join(process.cwd(), 'dist', 'education', subRel);
        if (fs.existsSync(targetUploads)) fs.unlinkSync(targetUploads);
        if (fs.existsSync(targetEdu)) fs.unlinkSync(targetEdu);
        if (fs.existsSync(targetDistEdu)) fs.unlinkSync(targetDistEdu);
      }
      return res.json({ success: true });
    } catch {
      return res.json({ success: true });
    }
  });

  // Admin user creation endpoint: Creates genuine user in Firebase Authentication
  app.post('/api/admin/create-user', async (req, res) => {
    try {
      const data = req.body;
      const result = await createAuthUserViaFirebase(data);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Server error creating user in Firebase Auth:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Terjadi kesalahan pada backend server.',
      });
    }
  });

  // Rollback endpoint: Deletes orphan Auth user if Firestore save fails
  app.post('/api/admin/rollback-user', async (req, res) => {
    try {
      const { tempToken } = req.body;
      const success = await rollbackAuthUser(tempToken);
      return res.json({ success });
    } catch (err: any) {
      console.error('Server error rolling back user:', err);
      return res.json({ success: false });
    }
  });

  // Reset password email endpoint
  app.post('/api/admin/reset-password', async (req, res) => {
    try {
      const { email } = req.body;
      const result = await sendPasswordResetViaApi(email);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error('Server error resetting password:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.match(/\.(jpg|jpeg|png|webp|svg|ico|pdf|txt|xml|json)$/i)) {
        return res.status(404).type('text/plain').send('Not Found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KantoJA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
