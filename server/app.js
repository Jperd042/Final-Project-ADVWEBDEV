const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const { ZodError } = require('zod');
const mongoose = require('mongoose');
const path = require('node:path');
const fs = require('node:fs');
const { router: auth } = require('./auth');
const inventory = require('./inventory');

const app = express();
const port = process.env.PORT || 5000;
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim());
origins.push(`http://localhost:${port}`, `http://127.0.0.1:${port}`);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (origin, callback) => callback(null, !origin || origins.includes(origin)), credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) {
    return res.status(403).json({ message: 'This request origin is not allowed.' });
  }
  next();
});
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test', message: { message: 'Too many requests. Please try again shortly.' } }));
app.get('/api/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable' }));
app.use('/api/auth', auth);
app.use('/api', inventory);
app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));

const clientBuild = path.resolve(__dirname, '../client/Final Project ADVWEBDEV/dist');
app.use(express.static(clientBuild));
app.get(/.*/, (req, res, next) => {
  if (fs.existsSync(path.join(clientBuild, 'index.html'))) return res.sendFile(path.join(clientBuild, 'index.html'));
  next();
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) return res.status(400).json({ message: error.issues.map(issue => `${issue.path.join('.') || 'Form'}: ${issue.message}`).join(' ') });
  if (error.code === 11000) return res.status(409).json({ message: error.keyPattern?.email ? 'This email is already registered.' : 'This SKU is already used by another product.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON request.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Please check the submitted values.' });
  console.error('Request failed:', error.name);
  res.status(500).json({ message: 'Unable to complete the request. Please try again.' });
});

module.exports = app;
