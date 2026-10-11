const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let database;
let app;
let owner;
let outsider;
let productId;

before(async () => {
  process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
  process.env.NODE_ENV = 'test';
  assert.doesNotThrow(() => { app = require('../app'); }, 'The inventory API must be implemented');
  database = await MongoMemoryServer.create({ binary: { downloadDir: path.join(__dirname, '../node_modules/.cache/mongodb-binaries') } });
  await mongoose.connect(database.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  owner = request.agent(app);
  outsider = request.agent(app);
});

after(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});

test('authentication validates input, hashes passwords, and protects inventory', async () => {
  const unauthenticated = await request(app).get('/api/products').expect(401);
  assert.equal(unauthenticated.body.code, 'UNAUTHENTICATED');
  await owner.post('/api/auth/register').send({ name: 'A', email: 'bad', password: '123' }).expect(400);
  const response = await owner.post('/api/auth/register').send({ name: 'Test Owner', email: 'owner@example.com', password: 'Password123!' }).expect(201);
  assert.equal(response.body.user.email, 'owner@example.com');
  assert.equal(response.body.user.password, undefined);
  assert.match(response.headers['set-cookie'][0], /HttpOnly/);
  const stored = await mongoose.connection.collection('users').findOne({ email: 'owner@example.com' });
  assert.notEqual(stored.password, 'Password123!');
  await request(app).post('/api/auth/register').send({ name: 'Duplicate', email: 'OWNER@example.com', password: 'Password123!' }).expect(409);
  await request(app).post('/api/auth/login').send({ email: 'owner@example.com', password: 'incorrect' }).expect(401);
  await outsider.post('/api/auth/register').send({ name: 'Other User', email: 'other@example.com', password: 'Password123!' }).expect(201);
});

test('product CRUD validates fields and scopes every operation to the owner', async () => {
  const fields = { name: 'Desk Lamp', sku: 'LAMP-01', category: 'Office', price: 450.5, quantity: 10, reorderLevel: 3, description: 'LED lamp' };
  const response = await owner.post('/api/products').send(fields).expect(201);
  productId = response.body.product._id;
  await owner.post('/api/products').send(fields).expect(409);
  await owner.post('/api/products').send({ ...fields, sku: 'INVALID', quantity: -1 }).expect(400);
  await owner.post('/api/products').send({ ...fields, sku: 'FRACTION', quantity: 1.5 }).expect(400);
  await owner.post('/api/products').send({ ...fields, sku: 'PRICE', price: 1.234 }).expect(400);
  assert.equal((await outsider.get('/api/products')).body.total, 0);
  await outsider.get(`/api/products/${productId}`).expect(404);
  await outsider.patch(`/api/products/${productId}`).send({ ...fields, quantity: undefined }).expect(404);
  await outsider.delete(`/api/products/${productId}`).expect(404);
  await outsider.post(`/api/products/${productId}/stock`).send({ type: 'out', quantity: 1 }).expect(404);
  await owner.get('/api/products/not-an-id').expect(400);
  await owner.get('/api/products?page=0').expect(400);
  await owner.patch(`/api/products/${productId}`).send({ ...fields, quantity: undefined, name: 'LED Desk Lamp' }).expect(200);
  await owner.patch(`/api/products/${productId}`).send({ quantity: 900 }).expect(400);
  assert.equal((await owner.get('/api/products?search=LED&category=Office&limit=1')).body.total, 1);
  assert.equal((await owner.get('/api/products?search=%5B')).body.total, 0);
});

test('stock operations are atomic and reject overselling and malformed adjustments', async () => {
  await owner.post(`/api/products/${productId}/stock`).send({ type: 'out', quantity: 0 }).expect(400);
  await owner.post(`/api/products/${productId}/stock`).send({ type: 'out', quantity: 11 }).expect(409);
  const responses = await Promise.all([1, 2].map(() => owner.post(`/api/products/${productId}/stock`).send({ type: 'out', quantity: 7, note: 'Issued to staff' })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal((await owner.get(`/api/products/${productId}`)).body.product.quantity, 3);
  const history = (await owner.get('/api/movements')).body;
  assert.equal(history.total, 2);
  assert.equal(history.items[0].balance, 3);
  const dashboard = (await owner.get('/api/dashboard')).body;
  assert.equal(dashboard.summary.totalUnits, 3);
  assert.equal(dashboard.summary.lowStock, 1);
  assert.equal(dashboard.summary.inventoryValue, 1351.5);
  assert.equal((await owner.get('/api/products?status=low')).body.total, 1);
  await owner.post(`/api/products/${productId}/stock`).send({ type: 'out', quantity: 3 }).expect(200);
  assert.equal((await owner.get('/api/products?status=out')).body.total, 1);
  await owner.post(`/api/products/${productId}/stock`).send({ type: 'in', quantity: 5, note: 'Restock' }).expect(200);
  assert.equal((await outsider.get('/api/movements')).body.total, 0);
  assert.equal((await outsider.get('/api/dashboard')).body.summary.products, 0);
});

test('deleting products preserves stock history and excludes them from dashboard', async () => {
  await owner.delete(`/api/products/${productId}`).expect(200);
  await owner.get(`/api/products/${productId}`).expect(404);
  assert.equal((await owner.get('/api/products')).body.total, 0);
  assert.equal((await owner.get('/api/movements')).body.total, 4);
  assert.equal((await owner.get('/api/dashboard')).body.summary.products, 0);
});

test('profile changes and logout invalidate old sessions and reject cross-origin writes', async () => {
  await owner.patch('/api/auth/profile').send({ name: 'Updated Owner', email: 'owner@example.com', password: 'NewPassword123!' }).expect(400);
  const wrongPassword = await owner.patch('/api/auth/profile').send({ name: 'Updated Owner', email: 'owner@example.com', currentPassword: 'wrong', password: 'NewPassword123!' }).expect(401);
  assert.equal(wrongPassword.body.code, undefined);
  await owner.patch('/api/auth/profile').send({ name: 'Updated Owner', email: 'owner@example.com', currentPassword: 'Password123!', password: 'NewPassword123!' }).expect(200);
  await request(app).post('/api/auth/login').send({ email: 'owner@example.com', password: 'Password123!' }).expect(401);
  const loggedIn = await owner.post('/api/auth/login').send({ email: 'owner@example.com', password: 'NewPassword123!' }).expect(200);
  const cookie = loggedIn.headers['set-cookie'][0].split(';')[0];
  await owner.post('/api/auth/logout').set('Origin', 'https://untrusted.example').expect(403);
  await owner.post('/api/auth/logout').expect(200);
  await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
  await owner.get('/api/auth/me').expect(401);
});
