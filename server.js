const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Img')));

// Configuration
const PAYSTACK_MODE = process.env.PAYSTACK_MODE || 'test';
const PAYSTACK_SECRET_KEY =
  PAYSTACK_MODE === 'live'
    ? process.env.PAYSTACK_SECRET_KEY_LIVE
    : process.env.PAYSTACK_SECRET_KEY_TEST;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PORT = process.env.PORT || 3000;

const requiredEnv = {
  PAYSTACK_PUBLIC_KEY_TEST: process.env.PAYSTACK_PUBLIC_KEY_TEST,
  PAYSTACK_SECRET_KEY_TEST: process.env.PAYSTACK_SECRET_KEY_TEST,
  PAYSTACK_PUBLIC_KEY_LIVE: process.env.PAYSTACK_PUBLIC_KEY_LIVE,
  PAYSTACK_SECRET_KEY_LIVE: process.env.PAYSTACK_SECRET_KEY_LIVE,
  JWT_SECRET: process.env.JWT_SECRET,
};

if (!requiredEnv.PAYSTACK_PUBLIC_KEY_TEST || !requiredEnv.PAYSTACK_SECRET_KEY_TEST) {
  console.warn(
    'WARNING: Paystack test keys are missing. Set PAYSTACK_PUBLIC_KEY_TEST and PAYSTACK_SECRET_KEY_TEST in .env.'
  );
}

if (!requiredEnv.PAYSTACK_PUBLIC_KEY_LIVE || !requiredEnv.PAYSTACK_SECRET_KEY_LIVE) {
  console.warn(
    'WARNING: Paystack live keys are missing. Set PAYSTACK_PUBLIC_KEY_LIVE and PAYSTACK_SECRET_KEY_LIVE in .env.'
  );
}

if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('WARNING: Using an insecure JWT secret. Set JWT_SECRET in .env for production.');
}

if (!['test', 'live'].includes(PAYSTACK_MODE)) {
  console.warn(
    `WARNING: Invalid PAYSTACK_MODE=${PAYSTACK_MODE} detected. Defaulting to test mode.`
  );
}

// Logger utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...data }));
}

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login/register attempts per 15 minutes
  message: 'Too many auth attempts, please try again later.',
  skipSuccessfulRequests: false,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 payment attempts per hour
  message: 'Too many payment requests, please try again later.',
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// JWT verification middleware (optional, for protected endpoints)
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ status: false, message: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    log('error', 'Token verification failed', { error: error.message });
    return res.status(401).json({ status: false, message: 'Invalid or expired token.' });
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/paystack/config', (req, res) => {
  try {
    const mode = PAYSTACK_MODE;
    const publicKey =
      mode === 'live' ? process.env.PAYSTACK_PUBLIC_KEY_LIVE : process.env.PAYSTACK_PUBLIC_KEY_TEST;

    if (!publicKey) {
      log('error', 'Paystack public key not configured');
      return res
        .status(500)
        .json({ status: false, message: 'Paystack public key not configured.' });
    }

    return res.json({ status: true, mode, publicKey });
  } catch (error) {
    log('error', 'Error fetching Paystack config', { error: error.message });
    return res.status(500).json({ status: false, message: 'Internal server error.' });
  }
});

app.post('/api/paystack/initialize', paymentLimiter, async (req, res) => {
  try {
    const { email, amount, planId } = req.body;
    if (!email || !amount || !planId) {
      log('warn', 'Missing payment details', { email, amount, planId });
      return res.status(400).json({ status: false, message: 'Missing payment details.' });
    }
    if (!PAYSTACK_SECRET_KEY) {
      log('error', 'Paystack secret key not configured');
      return res
        .status(500)
        .json({ status: false, message: 'Paystack secret key not configured.' });
    }

    // Ensure amount is an integer (Paystack expects smallest currency unit, e.g., kobo)
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      log('warn', 'Invalid amount provided', { amount });
      return res.status(400).json({ status: false, message: 'Invalid amount provided.' });
    }

    // If frontend sent a decimal (e.g. 2.99), it's likely dollars/naira — ensure integer smallest unit
    const amountInMinor = Math.round(numericAmount);

    const callbackUrl = process.env.CALLBACK_URL || `${req.protocol}://${req.get('host')}/index.html`;
    const payload = {
      email,
      amount: amountInMinor,
      callback_url: callbackUrl,
      metadata: { planId },
    };

    let response;
    try {
      response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // rely on the runtime fetch timeout if available; keep call simple
      });
    } catch (networkErr) {
      log('error', 'Paystack initialize network error', { error: networkErr.message });
      return res
        .status(502)
        .json({ status: false, message: 'Network error contacting Paystack provider.' });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      log('error', 'Failed to parse Paystack response', { error: parseErr.message });
      return res
        .status(502)
        .json({ status: false, message: 'Invalid response from payment provider.' });
    }

    if (!response.ok) {
      log('error', 'Paystack initialize failed', {
        status: response.status,
        message: data?.message || data,
      });
      // Forward provider response where possible to help debugging on client
      return res
        .status(response.status)
        .json(data || { status: false, message: 'Payment initialization failed.' });
    }

    log('info', 'Paystack transaction initialized', { email, amount: amountInMinor });
    return res.status(200).json(data);
  } catch (error) {
    log('error', 'Paystack initialize error', { error: error.message });
    return res.status(500).json({ status: false, message: 'Paystack initialize failed.' });
  }
});

app.get('/api/paystack/verify', async (req, res) => {
  try {
    const reference = req.query.reference;
    if (!reference) {
      log('warn', 'Missing payment reference');
      return res.status(400).json({ status: false, message: 'Missing reference.' });
    }

    if (!PAYSTACK_SECRET_KEY) {
      log('error', 'Paystack secret key not configured');
      return res
        .status(500)
        .json({ status: false, message: 'Paystack secret key not configured.' });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      log('error', 'Paystack verify failed', { status: response.status, reference });
      return res.status(response.status).json(data);
    }

    log('info', 'Payment verified', { reference, status: data.data?.status });
    return res.status(200).json(data);
  } catch (error) {
    log('error', 'Paystack verify error', { error: error.message });
    return res.status(500).json({ status: false, message: 'Paystack verify failed.' });
  }
});

// Secure auth endpoint for password hashing (frontend utility)
app.post('/api/auth/hash-password', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ status: false, message: 'Password required.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    log('info', 'Password hashed');
    return res.json({ status: true, hashedPassword });
  } catch (error) {
    log('error', 'Password hashing error', { error: error.message });
    return res.status(500).json({ status: false, message: 'Failed to hash password.' });
  }
});

// Secure auth endpoint for comparing passwords
app.post('/api/auth/verify-password', authLimiter, async (req, res) => {
  try {
    const { password, hash } = req.body;
    if (!password || !hash) {
      return res.status(400).json({ status: false, message: 'Password and hash required.' });
    }

    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) {
      log('warn', 'Password verification failed');
      return res.status(401).json({ status: false, message: 'Invalid password.' });
    }

    // Generate JWT token
    const token = jwt.sign({ verified: true }, JWT_SECRET, { expiresIn: '24h' });
    log('info', 'Password verified, token generated');
    return res.json({ status: true, token });
  } catch (error) {
    log('error', 'Password verification error', { error: error.message });
    return res.status(500).json({ status: false, message: 'Failed to verify password.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  log('error', 'Unhandled error', {
    message: err.message,
    statusCode,
    stack: err.stack,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    status: false,
    message: err.message || 'Internal server error.',
  });
});

// 404 handler
app.use((req, res) => {
  log('warn', 'Route not found', { method: req.method, path: req.path });
  res.status(404).json({ status: false, message: 'Route not found.' });
});

app.listen(PORT, () => {
  log('info', `INKurgic server running`, { port: PORT, url: `http://localhost:${PORT}` });
});
