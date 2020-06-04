require('dotenv').config();
const express = require('express');
const { getClientIp } = require('request-ip');
const { REDIRECTS } = require('../../public/shared_globals');
const { getLogger } = require('../logger');
const {
  isValidUsername,
  isValidPassword,
  isValidEmail,
} = require('../validation');
const { ensureAuthenticated } = require('../authentication');

const logger = getLogger();
const router = express.Router();

function init(database, emailer) {
  // DELETE resets the password.
  router.delete('/', (req, res) => {
    if (!emailer) {
      logger.warn(`${getClientIp(req)} failed to reset password: Emailer is unavailable`);
      return res.json({ error: 'Emailer service not available!' });
    }

    const username = req.body.resetPasswordUsername;
    const email = req.body.resetPasswordEmail;

    if (!isValidUsername(username)) {
      logger.warn(`${getClientIp(req)} failed to reset password with username '${username}': Invalid username`);
      return res.json({ error: 'Invalid username!' });
    }

    if (!isValidEmail(email)) {
      logger.info(`${getClientIp(req)} failed to reset password with username '${username}' and email '${email}': Invalid email`);
      return res.json({ error: 'Invalid email!' });
    }

    return database
      .findUserByName(username)
      .then((user) => {
        if (user.email !== email) {
          logger.warn(`${getClientIp(req)} failed to reset password with username '${username}' and email '${email}': Email doesn't match current email ('${user.email}')`);
          return res.json({ error: "Email doesn't match current email!" });
        }

        return database
          .resetPassword(user.id)
          .then((newPassword) => {
            emailer
              .sendNewPassword(user.email, newPassword)
              .then(() => {
                logger.info(`${getClientIp(req)} reset password`);
                return res.json({ msg: 'Password reset! Check your email!' });
              })
              .catch((err) => {
                logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
                return res.json({ error: err.toString() });
              });
          })
          .catch((err) => {
            logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
            return res.json({ error: err.toString() });
          });
      })
      .catch((err) => {
        logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
        return res.json({ error: err.toString() });
      });
  });

  // PUT changes the password.
  router.put('/', ensureAuthenticated, (req, res) => {
    const { currentPassword, newPassword, newPasswordAgain } = req.body;

    if (newPassword !== newPasswordAgain) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: New password doesn't match`);
      return res.json({ error: 'New password does not match!' });
    }

    if (!isValidPassword(newPassword)) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: Invalid new password`);
      return res.json({ error: 'Passwords must be at least 6 characters long!' });
    }

    return database
      .comparePassword(req.user.id, currentPassword)
      .then((match) => {
        if (match) {
          // Change password
          return database
            .changePassword(req.user.id, newPassword)
            .then(() => {
              logger.info(`${getClientIp(req)} ('${req.user.username}') changed password`);
              req.logout();
              res.json({ msg: 'Password changed!', redirect: REDIRECTS.PASSWORD_CHANGE.SUCCESS });
            })
            .catch((err) => {
              logger.error(`${getClientIp(req)} database.changePassword error: ${err}`);
              return res.json({ error: err.toString() });
            });
        }

        logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: Incorrect current password`);
        return res.json({ error: 'Incorrect password!' });
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} database.comparePassword error: ${err}`);
        return res.json({ error: err.toString() });
      });
  });

  return router;
}

module.exports = init;
