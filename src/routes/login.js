require('dotenv').config();
const express = require('express');
const passport = require('passport');
const { getClientIp } = require('request-ip');
const { getLogger } = require('../logger');
const { REDIRECTS } = require('../../public/js/shared_globals');

const logger = getLogger();
const router = express.Router();

// POST logins user.
router.post('/', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) {
      logger.warn(`${getClientIp(req)} failed to log in: ${err}`);
      return res
        .status(401)
        .json({ error: err.toString() });
    }

    if (!user) {
      logger.warn(`${getClientIp(req)} failed to log in: Incomplete login information`);
      return res
        .status(401)
        .json({ error: 'Incomplete login information!' });
    }

    return req.login(user, (loginErr) => {
      if (loginErr) {
        logger.error(`${getClientIp(req)} req.login error: ${loginErr}`);
        return res
          .status(401)
          .json({ error: loginErr.toString() });
      }

      logger.info(`${getClientIp(req)} logged in as '${req.user.username}'`);
      return res
        .status(200)
        .json({
          msg: `Welcome, ${req.user.username}!`,
          redirect: REDIRECTS.LOGIN.SUCCESS,
        });
    });
  })(req, res, next);
});

module.exports = router;
