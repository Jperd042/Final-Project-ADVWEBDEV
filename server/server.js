const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const mongoose = require('mongoose');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to at least 32 random characters in server/.env.');
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in server/.env.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const { User, Product } = require('./models');
  await Promise.all([User.init(), Product.init()]);
  const app = require('./app');
  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, '127.0.0.1', () => console.log(`Stockroom API ready at http://127.0.0.1:${port}`));
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Set PORT to an available port.` : 'Unable to start the API server.');
    mongoose.disconnect().finally(() => process.exit(1));
  });
  const stop = () => server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch(async error => {
  console.error(error.message.startsWith('Set ') ? error.message : `Database connection failed (${error.name}). Check MONGO_URI and database network access.`);
  await mongoose.disconnect();
  process.exit(1);
});

