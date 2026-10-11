const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { User } = require('./models');
const schemas = require('./validation');

const router = express.Router();
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' };
const tokenOptions = { issuer: 'stockroom', audience: 'stockroom-web' };
const publicUser = user => ({ _id: user._id, name: user.name, email: user.email, createdAt: user.createdAt });

function setSession(res, user) {
  const token = jwt.sign({ version: user.tokenVersion }, process.env.JWT_SECRET, { ...tokenOptions, subject: user._id.toString(), expiresIn: '8h' });
  res.cookie('stockroom_session', token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
}

async function authenticate(req, res, next) {
  const token = req.cookies.stockroom_session;
  if (!token) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { ...tokenOptions, algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Your session expired. Please sign in again.' });
  }
  if (!/^[a-f0-9]{24}$/i.test(payload.sub || '')) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Invalid session.' });
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.version) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Please sign in again.' });
  req.user = user;
  next();
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' },
});

router.post('/register', authLimiter, async (req, res) => {
  const data = schemas.register.parse(req.body);
  const user = await User.create({ ...data, password: await bcrypt.hash(data.password, 12) });
  setSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', authLimiter, async (req, res) => {
  const data = schemas.login.parse(req.body);
  const user = await User.findOne({ email: data.email }).select('+password +tokenVersion');
  if (!user || !(await bcrypt.compare(data.password, user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  setSession(res, user);
  res.json({ user: publicUser(user) });
});

router.use(authenticate);
router.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/logout', async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie('stockroom_session', cookieOptions);
  res.json({ message: 'Signed out.' });
});

router.patch('/profile', authLimiter, async (req, res) => {
  const data = schemas.profile.parse(req.body);
  const changes = { name: data.name, email: data.email };
  if (data.password) {
    const current = await User.findById(req.user._id).select('+password');
    if (!(await bcrypt.compare(data.currentPassword, current.password))) return res.status(401).json({ message: 'Current password is incorrect.' });
    changes.password = await bcrypt.hash(data.password, 12);
  }
  const update = { $set: changes };
  if (data.password) update.$inc = { tokenVersion: 1 };
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).select('+tokenVersion');
  if (data.password) setSession(res, user);
  res.json({ user: publicUser(user) });
});

module.exports = { router, authenticate };
