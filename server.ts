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
const SCHOOL_IDENTITY_FILE_PATH = path.join(SCHOOL_IDENTITY_STORAGE_DIR, 'school-identity.json');

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
    console.warn('Could not read persisted school-identity.json:', err);
  }
  return null;
}

function writePersistedSchoolIdentity(data: Record<string, any>): void {
  try {
    if (!fs.existsSync(SCHOOL_IDENTITY_STORAGE_DIR)) {
      fs.mkdirSync(SCHOOL_IDENTITY_STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(SCHOOL_IDENTITY_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write persisted school-identity.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Serve public SEO assets (robots.txt, sitemap.xml, Open Graph image)
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KantoJA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
