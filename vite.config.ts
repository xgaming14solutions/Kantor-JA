import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import {
  createAuthUserViaFirebase,
  rollbackAuthUser,
  sendPasswordResetViaApi,
} from './src/server/adminAuthService.ts';

function adminApiPlugin(): Plugin {
  return {
    name: 'admin-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/sitemap.xml' || req.url?.startsWith('/sitemap.xml?')) {
          const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
          if (fs.existsSync(sitemapPath)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
            res.end(fs.readFileSync(sitemapPath, 'utf-8'));
            return;
          }
        }

        if (req.url === '/robots.txt' || req.url?.startsWith('/robots.txt?')) {
          const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
          if (fs.existsSync(robotsPath)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
            res.end(fs.readFileSync(robotsPath, 'utf-8'));
            return;
          }
        }

        if (req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', server: 'KantoJA Middleware' }));
          return;
        }

        if (req.url === '/api/admin/create-user' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const result = await createAuthUserViaFirebase(data);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.success ? 200 : 400;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (req.url === '/api/admin/rollback-user' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { tempToken } = JSON.parse(body);
              const success = await rollbackAuthUser(tempToken);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success }));
            } catch {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false }));
            }
          });
          return;
        }

        if (req.url === '/api/admin/reset-password' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { email } = JSON.parse(body);
              const result = await sendPasswordResetViaApi(email);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.success ? 200 : 400;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        const reqPath = (req.url || '').split('?')[0].replace(/\/+$/, '');

        if (reqPath === '/api/upload-facility-photo' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { level, fileName, base64Data, mimeType } = JSON.parse(body);
              if (!level || !base64Data) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Data foto gedung tidak lengkap.' }));
                return;
              }
              const validLevels = ['tk', 'sd', 'smp', 'sma'];
              if (!validLevels.includes(level)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Jenjang pendidikan tidak valid.' }));
                return;
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
              if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
              if (!fs.existsSync(eduDir)) fs.mkdirSync(eduDir, { recursive: true });
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
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                downloadUrl: `/education/${level}/${safeFileName}`,
                storagePath: `schoolIdentity/education/${level}/${safeFileName}`,
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (reqPath === '/api/delete-facility-photo' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { storagePath } = JSON.parse(body);
              if (storagePath && typeof storagePath === 'string' && storagePath.startsWith('schoolIdentity/education/')) {
                const safePath = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
                const targetUploads = path.join(process.cwd(), 'public', 'uploads', safePath);
                const subRel = safePath.replace(/^schoolIdentity\/education\//, '');
                const targetEdu = path.join(process.cwd(), 'public', 'education', subRel);
                if (fs.existsSync(targetUploads)) fs.unlinkSync(targetUploads);
                if (fs.existsSync(targetEdu)) fs.unlinkSync(targetEdu);
              }
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), adminApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
