const mongoose = require('mongoose');

// Explicit initialization below can retry failures; Model.init() caches rejections.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

const app = require('./app');
const { User, Product } = require('./models');

// Vercel forwards requests through its reverse proxy.
app.set('trust proxy', 1);

let pendingConnection;
let indexesReady = false;

function connectDatabase() {
  if (!pendingConnection) {
    pendingConnection = (async () => {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 10000,
        });
      }
      if (!indexesReady) {
        await Promise.all([User, Product].map(async model => {
          await model.createCollection();
          await model.createIndexes();
        }));
        indexesReady = true;
      }
    })().finally(() => {
      pendingConnection = null;
    });
  }
  return pendingConnection;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.MONGO_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('Set MONGO_URI and JWT_SECRET (at least 32 characters) in Vercel.');
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Backend configuration is incomplete.' }));
  }

  try {
    await connectDatabase();
  } catch (error) {
    console.error('Database initialization failed:', error.name);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Unable to connect to the database.' }));
  }

  return app(req, res);
};
