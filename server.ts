import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createAuthUserViaFirebase,
  rollbackAuthUser,
  sendPasswordResetViaApi,
} from './src/server/adminAuthService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'KantoJA Server' });
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
