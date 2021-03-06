require('dotenv').config();
const express = require('express');
const { getClientIp } = require('request-ip');
const { Validator } = require('../validator');
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

    if (!Validator.checkUsername(newUser.username)) {
      logger.warn(`${getClientIp(req)} failed to create new account with username '${newUser.username}': Invalid username`);
      return res
        .status(422)
        .json({ error: 'Invalid username!' });
    }

    if (!Validator.checkEmail(newUser.email)) {
      logger.warn(`${getClientIp(req)} failed to create new account with username '${newUser.username}' and email '${newUser.email}': Invalid email`);
      return res
        .status(422)
        .json({ error: 'Invalid email!' });
    }

    if (!Validator.checkPassword(newUser.password)) {
      logger.warn(`${getClientIp(req)} failed to create new account: Invalid password`);
      return res
        .status(422)
        .json({ error: 'Passwords must be at least 6 characters long!' });
    }

    return database
      .createUser(newUser)
      .then((user) => req.login(user, (err) => {
        if (err) {
          logger.error(`${getClientIp(req)} req.login error: ${err}`);
          return res
            .status(500)
            .json({ error: err.toString() });
        }

        logger.info(`${getClientIp(req)} created new account with username '${newUser.username}' and email '${newUser.email}'`);
        return res
          .status(200)
          .json({ msg: `Account created! Welcome to Miniforum, ${newUser.username}!`, redirect: REDIRECTS.USER_CREATE.SUCCESS });
      }))
      .catch((err) => {
        logger.warn(`${getClientIp(req)} failed to create new account: ${err}`);
        return res
          .status(500)
          .json({ error: err.toString() });
      });
  });

  return router;
}

module.exports = init;
