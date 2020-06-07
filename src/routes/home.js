require('dotenv').config();
const express = require('express');
const { PUBLIC_DIR } = require('../globals');

const router = express.Router();

// GET returns home page.
router.get('/', (req, res) => {
  res.sendFile('html/login.html', { root: PUBLIC_DIR });
});

module.exports = router;
