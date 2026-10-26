const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const courseRoutes = require('./routes/courseRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. Hide framework identity and inject secure HTTP headers
app.disable('x-powered-by');
app.use(helmet());

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

// 5. Mount API routes
app.use('/api/courses', courseRoutes);

// 6. Catch unmapped routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// 7. Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
