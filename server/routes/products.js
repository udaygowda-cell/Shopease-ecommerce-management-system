const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/products  (public, supports ?search=&category=&sort=)
router.get('/', (req, res) => {
  const { search, category, sort, minPrice, maxPrice } = req.query;
  const db = readDB();
  let products = db.products;

  if (search) {
    const q = search.toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }
  if (category) {
    products = products.filter((p) => p.categoryId === category);
  }
  if (minPrice) products = products.filter((p) => p.price >= parseFloat(minPrice));
  if (maxPrice) products = products.filter((p) => p.price <= parseFloat(maxPrice));

  if (sort === 'price_asc') products = [...products].sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') products = [...products].sort((a, b) => b.price - a.price);
  if (sort === 'newest') products = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ products, categories: db.categories });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product });
});

// POST /api/products  (admin only)
router.post('/', authRequired, adminRequired, (req, res) => {
  const { name, description, price, stock, categoryId, image, sku } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'name and price are required' });

  const db = readDB();
  const product = {
    id: uuidv4(),
    name,
    description: description || '',
    price: parseFloat(price),
    stock: stock !== undefined ? parseInt(stock) : 0,
    categoryId: categoryId || null,
    image: image || 'https://picsum.photos/400/300',
    sku: sku || `SKU-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  db.products.push(product);
  writeDB(db);
  res.status(201).json({ product });
});

// PUT /api/products/:id  (admin only)
router.put('/:id', authRequired, adminRequired, (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const updatable = ['name', 'description', 'price', 'stock', 'categoryId', 'image', 'sku'];
  updatable.forEach((field) => {
    if (req.body[field] !== undefined) {
      db.products[idx][field] = field === 'price' ? parseFloat(req.body[field])
        : field === 'stock' ? parseInt(req.body[field])
        : req.body[field];
    }
  });
  writeDB(db);
  res.json({ product: db.products[idx] });
});

// DELETE /api/products/:id  (admin only)
router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const removed = db.products.splice(idx, 1);
  writeDB(db);
  res.json({ product: removed[0] });
});

module.exports = router;
