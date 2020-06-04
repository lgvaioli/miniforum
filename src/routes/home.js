require('dotenv').config();
const express = require('express');

const router = express.Router();

// GET returns home page.
router.get('/', (req, res) => {
  res.sendFile('login.html', { root: process.env.PUBLIC_DIR });
});

module.exports = router;
