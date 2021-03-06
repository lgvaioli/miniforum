require('dotenv').config();
const express = require('express');
const { getClientIp } = require('request-ip');
const { getLogger } = require('../logger');
const { REDIRECTS } = require('../../public/js/shared_globals');
const { ensureAuthenticated } = require('../authentication');

const logger = getLogger();
const router = express.Router();

// GET logs out user.
router.get('/', ensureAuthenticated, (req, res) => {
  const { username } = req.user;

  req.logout();

  logger.info(`${getClientIp(req)} ('${username}') logged out`);

  /**
   * We don't actually redirect because we use jQuery ajax in the client
   * side, and handling "real" redirects with that is a mess.
   */
  res
    .status(200)
    .json({ redirect: REDIRECTS.LOGOUT.SUCCESS });
});

module.exports = router;
