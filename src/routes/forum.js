const express = require('express');
const { ensureAuthenticated } = require('../authentication');
const { PUBLIC_DIR } = require('../globals');

const router = express.Router();

// GET returns forum page.
router.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile('html/forum.html', { root: PUBLIC_DIR });
});

module.exports = router;
