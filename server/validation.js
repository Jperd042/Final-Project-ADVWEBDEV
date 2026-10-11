const { z } = require('zod');

const name = z.string().trim().min(2).max(80);
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(8).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes.');
const count = z.number().int().min(0).max(1000000000);
const productFields = {
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(40).toUpperCase(),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).default(''),
  price: z.number().min(0).max(1000000000).refine(value => Number(value.toFixed(2)) === value, 'Price must have at most two decimal places.'),
  reorderLevel: count,
};

module.exports = {
  register: z.strictObject({ name, email, password }),
  login: z.strictObject({ email, password: z.string().min(1).max(200) }),
  profile: z.strictObject({ name, currentPassword: z.string().max(200).optional(), password: password.optional() })
    .refine(value => !value.password || Boolean(value.currentPassword), 'Current password is required to set a new password.'),
  deleteAccount: z.strictObject({ currentPassword: z.string().min(1).max(200), confirmation: z.literal('DELETE') }),
  productCreate: z.strictObject({ ...productFields, quantity: count }),
  productUpdate: z.strictObject(productFields),
  stock: z.strictObject({ type: z.enum(['in', 'out']), quantity: count.min(1), note: z.string().trim().max(250).default('') }),
  listing: z.object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(120).default(''),
    category: z.string().trim().max(60).default(''),
    status: z.enum(['all', 'low', 'out']).default('all'),
  }),
};
