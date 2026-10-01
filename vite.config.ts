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
