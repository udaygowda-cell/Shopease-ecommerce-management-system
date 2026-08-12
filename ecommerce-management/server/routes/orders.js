const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders  (any logged-in user places an order)
router.post('/', authRequired, (req, res) => {
  const { items, shippingAddress } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const db = readDB();
  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
    }
    total += product.price * item.quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity
    });
    product.stock -= item.quantity;
  }

  const order = {
    id: uuidv4(),
    userId: req.user.id,
    customerName: req.user.name,
    items: orderItems,
    total: parseFloat(total.toFixed(2)),
    status: 'pending',
    shippingAddress: shippingAddress || '',
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  writeDB(db);
  res.status(201).json({ order });
});

// GET /api/orders  (admin sees all, user sees own)
router.get('/', authRequired, (req, res) => {
  const db = readDB();
  if (req.user.role === 'admin') {
    return res.json({ orders: db.orders });
  }
  const orders = db.orders.filter((o) => o.userId === req.user.id);
  res.json({ orders });
});

// GET /api/orders/:id
router.get('/:id', authRequired, (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role !== 'admin' && order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ order });
});

// PUT /api/orders/:id/status  (admin only)
router.put('/:id/status', authRequired, adminRequired, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });

  const db = readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status;
  writeDB(db);
  res.json({ order });
});

module.exports = router;
