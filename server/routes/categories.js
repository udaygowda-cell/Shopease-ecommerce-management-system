const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = readDB();
  res.json({ categories: db.categories });
});

router.post('/', authRequired, adminRequired, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const db = readDB();
  const category = { id: uuidv4(), name };
  db.categories.push(category);
  writeDB(db);
  res.status(201).json({ category });
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const db = readDB();
  const idx = db.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  const removed = db.categories.splice(idx, 1);
  writeDB(db);
  res.json({ category: removed[0] });
});

module.exports = router;
