const helmet = require('helmet');
const cors = require('cors');
const env = require('../config/environment');

const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", env.r2?.publicUrl || "*"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: true },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  });
};

const configureCors = () => {
  const allowedOrigins = [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (mobile apps, curl, postman, server-to-server)
      if (!origin) return callback(null, true);

      // Explicit allowlist
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow any *.vercel.app domain automatically
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) {
          return callback(null, true);
        }
      } catch {}

      // In dev mode, allow unknown origins with a warning
      if (env.nodeEnv !== 'production') {
        console.warn(`[CORS Gateway] Unknown origin allowed in dev: ${origin}`);
        return callback(null, true);
      }

      // Production — block unknown origins
      console.warn(`[CORS Gateway] Blocked unknown origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS gateway policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['X-Request-Id']
  });
};

module.exports = {
  helmetGateway: configureHelmet(),
  corsGateway: configureCors()
};
