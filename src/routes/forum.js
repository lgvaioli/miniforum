require('dotenv').config();
const express = require('express');
const { ensureAuthenticated } = require('../authentication');

const router = express.Router();

// GET returns forum page.
router.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile('forum.html', { root: process.env.PUBLIC_DIR });
});

module.exports = router;
