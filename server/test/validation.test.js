const { test } = require('node:test');
const assert = require('node:assert/strict');
const { productCreate } = require('../validation');

test('prices reject precision that would produce incorrect inventory totals', () => {
  const product = { name: 'Item', sku: 'ITEM', category: 'General', price: 1.2300009, quantity: 10000, reorderLevel: 0 };
  assert.equal(productCreate.safeParse(product).success, false);
  assert.equal(productCreate.safeParse({ ...product, price: 1.23 }).success, true);
  assert.equal(productCreate.safeParse({ ...product, price: 0.29 }).success, true);
});
