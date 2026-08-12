const express = require('express');
const { readDB } = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats  (admin only)
router.get('/stats', authRequired, adminRequired, (req, res) => {
  const db = readDB();

  const totalRevenue = db.orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrders = db.orders.length;
  const totalProducts = db.products.length;
  const totalCustomers = db.users.filter((u) => u.role === 'customer').length;
  const lowStock = db.products.filter((p) => p.stock <= 10);

  const statusCounts = db.orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const salesByProduct = {};
  db.orders.forEach((o) => {
    o.items.forEach((item) => {
      salesByProduct[item.name] = (salesByProduct[item.name] || 0) + item.quantity;
    });
  });
  const topProducts = Object.entries(salesByProduct)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  res.json({
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalOrders,
    totalProducts,
    totalCustomers,
    lowStock,
    statusCounts,
    topProducts,
    recentOrders: [...db.orders].reverse().slice(0, 5)
  });
});

module.exports = router;
