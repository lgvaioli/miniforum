const express = require('express');
const { getClientIp } = require('request-ip');
const { REDIRECTS } = require('../../public/js/shared_globals');
const { PUBLIC_DIR } = require('../globals');
const { getLogger } = require('../logger');
const { Validator } = require('../validator');
const { ensureAuthenticated } = require('../authentication');

const logger = getLogger();
const router = express.Router();

function init(database, emailer) {
  // GET sends the 'Change password' page.
  router.get('/', ensureAuthenticated, (req, res) => {
    res
      .status(200)
      .sendFile('html/change_password.html', { root: PUBLIC_DIR });
  });

  // DELETE resets the password.
  router.delete('/', (req, res) => {
    if (!emailer) {
      logger.warn(`${getClientIp(req)} failed to reset password: Emailer is unavailable`);
      return res
        .status(501)
        .json({ error: 'Emailer service not available!' });
    }

    const username = req.body.resetPasswordUsername;
    const email = req.body.resetPasswordEmail;

    if (!Validator.checkUsername(username)) {
      logger.warn(`${getClientIp(req)} failed to reset password with username '${username}': Invalid username`);
      return res
        .status(401)
        .json({ error: 'Invalid username!' });
    }

    if (!Validator.checkEmail(email)) {
      logger.info(`${getClientIp(req)} failed to reset password with username '${username}' and email '${email}': Invalid email`);
      return res
        .status(401)
        .json({ error: 'Invalid email!' });
    }

    return database
      .findUserByName(username)
      .then((user) => {
        if (user.email !== email) {
          logger.warn(`${getClientIp(req)} failed to reset password with username '${username}' and email '${email}': Email doesn't match current email ('${user.email}')`);
          return res
            .status(401)
            .json({ error: "Email doesn't match current email!" });
        }

        return database
          .resetPassword(user.id)
          .then((newPassword) => {
            emailer
              .sendNewPassword(user.email, newPassword)
              .then(() => {
                logger.info(`${getClientIp(req)} reset password`);
                return res
                  .status(200)
                  .json({ msg: 'Password reset! Check your email!' });
              })
              .catch((err) => {
                logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
                return res
                  .status(500)
                  .json({ error: err.toString() });
              });
          })
          .catch((err) => {
            logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
            return res
              .status(500)
              .json({ error: err.toString() });
          });
      })
      .catch((err) => {
        logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
        return res
          .status(500)
          .json({ error: err.toString() });
      });
  });

  // PUT changes the password.
  router.put('/', ensureAuthenticated, (req, res) => {
    const { currentPassword, newPassword, newPasswordAgain } = req.body;

    if (newPassword !== newPasswordAgain) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: New password doesn't match`);
      return res
        .status(401)
        .json({ error: 'New password does not match!' });
    }

    if (!Validator.checkPassword(newPassword)) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: Invalid new password`);
      return res
        .status(401)
        .json({ error: 'Passwords must be at least 6 characters long!' });
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
              res
                .status(200)
                .json({ msg: 'Password changed!', redirect: REDIRECTS.PASSWORD_CHANGE.SUCCESS });
            })
            .catch((err) => {
              logger.error(`${getClientIp(req)} database.changePassword error: ${err}`);
              return res
                .status(500)
                .json({ error: err.toString() });
            });
        }

        logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: Incorrect current password`);
        return res
          .status(401)
          .json({ error: 'Incorrect password!' });
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} database.comparePassword error: ${err}`);
        return res
          .status(500)
          .json({ error: err.toString() });
      });
  });

  return router;
}

module.exports = init;
