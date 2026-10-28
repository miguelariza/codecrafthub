const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const courseRoutes = require('./routes/courseRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. Hide framework identity and inject secure HTTP headers
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcElem: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["https://fonts.gstatic.com"],
      },
    },
  })
);

// 2. Enable controlled CORS policies
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Mitigate DoS attacks on file writes with rate limiting (skip during tests)
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again after 15 minutes.'
    }
  });
  app.use('/api/', limiter);
}

// 4. Enforce strict JSON body size limits to prevent heap exhaustion attacks
app.use(express.json({ limit: '10kb' }));

// 5. Serve static files (CSS, JS, images, etc.)
// NOTE: Adjust '../public' to match your actual frontend build/static folder path.
// If your assets are in the same folder as index.html, use '../' instead.
app.use(express.static(path.join(__dirname, '../public')));

// 6. Mount API routes
app.use('/api/courses', courseRoutes);

// 7. Catch unmapped routes
app.use((req, res, next) => {
  // If it's an API route, return a JSON 404
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: `Cannot ${req.method} ${req.originalUrl}`
    });
  }
  
  // For non-API routes, serve index.html (Standard fallback for Single Page Applications)
  // If you are NOT building an SPA, you can change this to res.status(404).sendFile(...) 
  // pointing to a dedicated 404.html page instead.
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 8. Centralized error handling middleware
app.use(errorHandler);

module.exports = app;