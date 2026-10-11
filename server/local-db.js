const fs = require('node:fs/promises');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function startLocalDatabase() {
  const dbPath = path.join(__dirname, '.data');
  await fs.mkdir(dbPath, { recursive: true });
  return MongoMemoryServer.create({
    instance: { dbPath, dbName: 'stockroom', storageEngine: 'wiredTiger', ip: '127.0.0.1' },
    binary: { downloadDir: path.join(__dirname, 'node_modules/.cache/mongodb-memory-server') },
  });
};
