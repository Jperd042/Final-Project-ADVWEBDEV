const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const request = require('supertest');
const mongoose = require('mongoose');
const { User, Product } = require('../models');

test('Vercel serves the existing API after database initialization', async (t) => {
  const entry = path.resolve(__dirname, '../../api/index.js');
  assert.ok(existsSync(entry), 'A root Vercel API entry point must exist');

  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = 'mongodb://test.invalid/stockroom';
  process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
  process.env.CLIENT_ORIGIN = 'https://stockroom.example';

  // Only the external database boundary is stubbed. Requests use real Express routes.
  let connections = 0;
  let shouldFail = false;
  let releaseConnection;
  t.mock.method(mongoose, 'connect', async () => {
    connections++;
    if (releaseConnection) await new Promise(resolve => { releaseConnection.resolve = resolve; });
    if (shouldFail) throw new Error('Simulated database outage');
    mongoose.connection.readyState = 1;
    return mongoose;
  });
  t.mock.method(User, 'init', async () => User);
  t.mock.method(Product, 'init', async () => Product);
  const handler = require(entry);

  await t.test('returns JSON 503 when configuration is missing', async () => {
    const secret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const response = await request(handler).get('/api/health');
    assert.equal(response.status, 503);
    assert.equal(connections, 0);
    assert.match(response.headers['cache-control'], /no-store/);
    process.env.JWT_SECRET = secret;
  });

  await t.test('concurrent requests share initialization and reach the health route', async () => {
    mongoose.connection.readyState = 0;
    releaseConnection = {};
    const first = request(handler).get('/api/health').then(r => r);
    const second = request(handler).get('/api/health').then(r => r);
    while (!releaseConnection.resolve) await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setTimeout(resolve, 30));
    releaseConnection.resolve();
    const responses = await Promise.all([first, second]);
    releaseConnection = null;
    assert.equal(connections, 1);
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { status: 'ok' });
    }
  });

  await t.test('signed-out sessions return the expected JSON 401', async () => {
    const response = await request(handler).get('/api/auth/me');
    assert.equal(response.status, 401);
    assert.equal(response.body.code, 'UNAUTHENTICATED');
    assert.equal(connections, 1);
  });

  await t.test('retries initialization after a database failure', async () => {
    mongoose.connection.readyState = 0;
    shouldFail = true;
    assert.equal((await request(handler).get('/api/health')).status, 503);
    shouldFail = false;
    assert.equal((await request(handler).get('/api/health')).status, 200);
    assert.equal(connections, 3);
  });

  await t.test('keeps the existing authentication guard on other API routes', async () => {
    const response = await request(handler).get('/api/not-a-route');
    assert.equal(response.status, 401);
    assert.equal(response.body.code, 'UNAUTHENTICATED');
    assert.match(response.headers['content-type'], /application\/json/);
  });

  mongoose.connection.readyState = 0;
});
