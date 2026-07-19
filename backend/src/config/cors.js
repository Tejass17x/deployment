const env = require('./environment');

/**
 * List of explicitly allowed origins (used alongside domain pattern matching).
 * Add your Render/CLIENT_URL env var + local dev URLs here.
 */
const allowedOrigins = [
  env.clientUrl,
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
];

/**
 * Check whether an origin matches any *.vercel.app domain.
 * This automatically allows every Vercel deployment without manual updates.
 */
const isVercelOrigin = (origin) => {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'vercel.app' || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

module.exports = {
  origin: function (origin, callback) {
    // Allow requests with no Origin header (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);

    // Explicit allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Any *.vercel.app domain is automatically allowed
    if (isVercelOrigin(origin)) {
      return callback(null, true);
    }

    // Fallback: allow in development, log warning in production
    if (env.nodeEnv !== 'production') {
      console.warn(`[CORS] Unknown origin allowed in dev: ${origin}`);
      return callback(null, true);
    }

    // Production — reject unknown origins
    console.warn(`[CORS] Blocked unknown origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
};
