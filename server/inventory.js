const express = require('express');
const mongoose = require('mongoose');
const { Product } = require('./models');
const schemas = require('./validation');
const { authenticate } = require('./auth');

const router = express.Router();
router.use(authenticate);
const escapeSearch = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const active = req => ({ owner: req.user._id, archived: false });
const publicProduct = product => {
  const { owner, archived, movements, __v, ...fields } = product.toObject ? product.toObject() : product;
  return fields;
};
const paginated = (items, total, page, limit) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ message: 'Invalid product ID.' });
  next();
});

function movementPipeline(owner, search = '') {
  const pipeline = [
    { $match: { owner } },
    { $unwind: '$movements' },
    { $project: {
      _id: '$movements._id', productId: '$_id', productName: '$movements.productName',
      sku: '$movements.sku', type: '$movements.type', quantity: '$movements.quantity',
      balance: '$movements.balance', note: '$movements.note', createdAt: '$movements.createdAt',
    } },
  ];
  if (search) pipeline.push({ $match: { $or: ['productName', 'sku', 'note'].map(field => ({ [field]: { $regex: escapeSearch(search), $options: 'i' } })) } });
  pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
  return pipeline;
}

router.get('/products', async (req, res) => {
  const { page, limit, search, category, status } = schemas.listing.parse(req.query);
  const filter = active(req);
  if (search) filter.$or = ['name', 'sku'].map(field => ({ [field]: { $regex: escapeSearch(search), $options: 'i' } }));
  if (category) filter.category = category;
  if (status === 'out') filter.quantity = 0;
  if (status === 'low') {
    filter.quantity = { $gt: 0 };
    filter.$expr = { $lte: ['$quantity', '$reorderLevel'] };
  }
  const [products, total, categories] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter), Product.distinct('category', active(req)),
  ]);
  res.json({ ...paginated(products.map(publicProduct), total, page, limit), categories: categories.sort() });
});

router.post('/products', async (req, res) => {
  const data = schemas.productCreate.parse(req.body);
  const movements = data.quantity ? [{ productName: data.name, sku: data.sku, type: 'opening', quantity: data.quantity, balance: data.quantity, note: 'Opening stock' }] : [];
  const product = await Product.create({ ...data, owner: req.user._id, movements });
  res.status(201).json({ product: publicProduct(product) });
});

router.get('/products/:id', async (req, res) => {
  const product = await Product.findOne({ ...active(req), _id: req.params.id });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ product: publicProduct(product) });
});

router.patch('/products/:id', async (req, res) => {
  const data = schemas.productUpdate.parse(req.body);
  const product = await Product.findOneAndUpdate({ ...active(req), _id: req.params.id }, { $set: data }, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ product: publicProduct(product) });
});

router.delete('/products/:id', async (req, res) => {
  const product = await Product.findOneAndUpdate({ ...active(req), _id: req.params.id }, { $set: { archived: true } });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product deleted. Stock history retained.' });
});

router.post('/products/:id/stock', async (req, res) => {
  const data = schemas.stock.parse(req.body);
  const delta = data.type === 'in' ? data.quantity : -data.quantity;
  const filter = { ...active(req), _id: req.params.id, quantity: data.type === 'out' ? { $gte: data.quantity } : { $lte: 1000000000 - data.quantity } };
  const balance = { $add: ['$quantity', delta] };
  const product = await Product.findOneAndUpdate(filter, [{ $set: {
    quantity: balance,
    movements: { $concatArrays: ['$movements', [{
      _id: new mongoose.Types.ObjectId(), productName: '$name', sku: '$sku', type: data.type,
      quantity: data.quantity, balance, note: { $literal: data.note }, createdAt: new Date(),
    }]] },
  } }], { new: true });
  if (!product) {
    const exists = await Product.exists({ ...active(req), _id: req.params.id });
    return res.status(exists ? 409 : 404).json({ message: exists ? 'Stock adjustment exceeds the available quantity or maximum stock limit.' : 'Product not found.' });
  }
  res.json({ product: publicProduct(product) });
});

router.get('/movements', async (req, res) => {
  const { page, limit, search } = schemas.listing.parse(req.query);
  const [result] = await Product.aggregate([
    ...movementPipeline(req.user._id, search),
    { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }], count: [{ $count: 'total' }] } },
  ]);
  res.json(paginated(result.items, result.count[0]?.total || 0, page, limit));
});

router.get('/dashboard', async (req, res) => {
  const [totals, lowStock, recentMovements] = await Promise.all([
    Product.aggregate([
      { $match: active(req) },
      { $group: {
        _id: null, products: { $sum: 1 }, totalUnits: { $sum: '$quantity' },
        inventoryValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$reorderLevel'] }] }, 1, 0] } },
        outOfStock: { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
      } },
      { $project: { _id: 0, products: 1, totalUnits: 1, inventoryValue: { $round: ['$inventoryValue', 2] }, lowStock: 1, outOfStock: 1 } },
    ]),
    Product.find({ ...active(req), $expr: { $lte: ['$quantity', '$reorderLevel'] } }).sort({ quantity: 1, name: 1 }).limit(6).lean(),
    Product.aggregate([...movementPipeline(req.user._id), { $limit: 6 }]),
  ]);
  res.json({
    summary: totals[0] || { products: 0, totalUnits: 0, inventoryValue: 0, lowStock: 0, outOfStock: 0 },
    lowStock: lowStock.map(publicProduct), recentMovements,
  });
});

module.exports = router;
