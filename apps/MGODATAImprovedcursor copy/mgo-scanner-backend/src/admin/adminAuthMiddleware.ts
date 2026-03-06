/**
 * Admin Console Authentication Middleware
 * Protects /admin and /docs routes
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractBearerToken } from '../lib/jwt';
import { UserRole } from '@prisma/client';

/**
 * Require admin access for admin console
 * Uses JWT if provided, falls back to Basic Auth
 */
export function requireAdminAccess(req: Request, res: Response, next: NextFunction): void {
  // Option 1: Try JWT authentication
  const token = extractBearerToken(req.headers.authorization);
  
  if (token) {
    const payload = verifyToken(token);
    if (payload && (payload.role === UserRole.ADMIN || payload.role === UserRole.SUPERADMIN)) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
      };
      next();
      return;
    }
  }

  // Option 2: Try Basic Auth (for quick admin access)
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (adminUser && adminPass && username === adminUser && password === adminPass) {
      // Create a pseudo user object for basic auth
      req.user = {
        id: 'admin',
        email: adminUser,
        role: UserRole.ADMIN,
      };
      next();
      return;
    }
  }

  // Neither JWT nor Basic Auth worked
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Console"');
  res.status(401).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Required</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .auth-box {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
        }
        h1 { margin: 0 0 10px; font-size: 24px; color: #333; }
        p { color: #666; margin: 10px 0; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="auth-box">
        <h1>🔒 Authentication Required</h1>
        <p>This admin console requires authentication.</p>
        <p><strong>Option 1:</strong> JWT Token (Admin/Superadmin role)</p>
        <p><strong>Option 2:</strong> Basic Auth (set <code>ADMIN_USER</code> and <code>ADMIN_PASS</code> in .env)</p>
      </div>
    </body>
    </html>
  `);
}



