require('dotenv').config();
const express = require('express');
const { getClientIp } = require('request-ip');
const {
  isValidUsername,
  isValidEmail,
  isValidPassword,
} = require('../validation');
const { REDIRECTS } = require('../../public/js/shared_globals');
const { getLogger } = require('../logger');

const logger = getLogger();
const router = express.Router();

function init(database) {
  // POST creates new user.
  router.post('/', (req, res) => {
    const newUser = {
      username: req.body.accountUsername,
      email: req.body.accountEmail,
      password: req.body.accountPassword,
    };

    if (!isValidUsername(newUser.username)) {
      logger.warn(`${getClientIp(req)} failed to create new account with username '${newUser.username}': Invalid username`);
      return res.json({ error: 'Invalid username!' });
    }

    if (!isValidEmail(newUser.email)) {
      logger.warn(`${getClientIp(req)} failed to create new account with username '${newUser.username}' and email '${newUser.email}': Invalid email`);
      return res.json({ error: 'Invalid email!' });
    }

    if (!isValidPassword(newUser.password)) {
      logger.warn(`${getClientIp(req)} failed to create new account: Invalid password`);
      return res.json({ error: 'Passwords must be at least 6 characters long!' });
    }

    return database
      .createUser(newUser)
      .then((user) => req.login(user, (err) => {
        if (err) {
          logger.error(`${getClientIp(req)} req.login error: ${err}`);
          return res.json({ error: err.toString() });
        }

        logger.info(`${getClientIp(req)} created new account with username '${newUser.username}' and email '${newUser.email}'`);
        return res.json({ msg: `Account created! Welcome to Miniforum, ${newUser.username}!`, redirect: REDIRECTS.USER_CREATE.SUCCESS });
      }))
      .catch((err) => {
        logger.warn(`${getClientIp(req)} failed to create new account: ${err}`);
        return res.json({ error: err.toString() });
      });
  });

  return router;
}

module.exports = init;
