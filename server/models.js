const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0, select: false },
}, { timestamps: true });

const movementSchema = new mongoose.Schema({
  productName: String,
  sku: String,
  type: { type: String, enum: ['opening', 'in', 'out'], required: true },
  quantity: { type: Number, required: true },
  balance: { type: Number, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: '', maxlength: 500 },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  reorderLevel: { type: Number, required: true, min: 0 },
  archived: { type: Boolean, default: false },
  movements: { type: [movementSchema], default: [], select: false },
}, { timestamps: true });

productSchema.index({ owner: 1, sku: 1 }, { unique: true, partialFilterExpression: { archived: false } });

module.exports = {
  User: mongoose.model('User', userSchema),
  Product: mongoose.model('Product', productSchema),
};
