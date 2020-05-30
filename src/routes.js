require('dotenv').config();
const passport = require('passport');
const { getClientIp } = require('request-ip');
const {
  isValidUsername,
  isValidEmail,
  isValidPassword,
  isValidComment,
} = require('./validation');
const { getLogger } = require('./logger');

const logger = getLogger();

// Redirect URLs
const LOGIN_FAILURE_REDIRECT_URL = '/';
const LOGIN_SUCCESS_REDIRECT_URL = '/forum';
const NEW_ACCOUNT_SUCCESS_REDIRECT_URL = '/forum';
const NEW_ACCOUNT_FAILURE_REDIRECT_URL = '/';
const LOGOUT_REDIRECT_URL = '/';

// Middleware which uses Passport's isAuthenticated to make sure a user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.redirect(LOGIN_FAILURE_REDIRECT_URL);
}

// Takes an express app and sets up our routes
function setupRoutes(app, db, emailer) {
  app.route('/')
    .get((req, res) => {
      res.sendFile('login.html', { root: process.env.PUBLIC_DIR });
    });

  app.route('/api/login')
    .post((req, res, next) => {
      passport.authenticate('local', (err, user) => {
        if (err) {
          logger.warn(`${getClientIp(req)} ${err}`);
          return res.render('error', { message: err });
        }

        if (!user) {
          logger.warn(`${getClientIp(req)} failed to log in: No login information`);
          return res.render('error', { message: 'No login information!' });
        }

        return req.login(user, (loginErr) => {
          if (loginErr) {
            logger.error(`${getClientIp(req)} req.login error: ${loginErr}`);
            return res.render('error', { message: loginErr });
          }

          logger.info(`${getClientIp(req)} logged in as '${req.user.username}'`);
          return res.redirect(LOGIN_SUCCESS_REDIRECT_URL);
        });
      })(req, res, next);
    });

  app.route('/forum')
    .get(ensureAuthenticated, (req, res) => {
      res.sendFile('forum.html', { root: process.env.PUBLIC_DIR });
    });

  app.route('/api/newAccount')
    .post((req, res) => {
      const newUser = {
        username: req.body.accountUsername,
        email: req.body.accountEmail,
        password: req.body.accountPassword,
      };

      if (!isValidUsername(newUser.username)) {
        logger.warn(`${getClientIp(req)} failed to create new account with username '${newUser.username}': Invalid username`);
        return res.render('error', { message: 'Invalid username!' });
      }

      if (!isValidEmail(newUser.email)) {
        logger.warn(`${getClientIp(req)} failed to create new account with username '${newUser.username}' and email '${newUser.email}': Invalid email`);
        return res.render('error', { message: 'Invalid email!' });
      }

      if (!isValidPassword(newUser.password)) {
        logger.warn(`${getClientIp(req)} failed to create new account: Invalid password`);
        return res.render('error', { message: 'Passwords must be at least 6 characters long!' });
      }

      return db.createUser(newUser)
        // eslint-disable-next-line arrow-body-style
        .then((user) => {
          // User didn't exist, log him in
          return req.login(user, (err) => {
            if (err) {
              logger.error(`${getClientIp(req)} req.login error: ${err}`);
              return res.redirect(NEW_ACCOUNT_FAILURE_REDIRECT_URL);
            }

            logger.info(`${getClientIp(req)} created new account with username '${newUser.username}' and email '${newUser.email}'`);
            return res.redirect(NEW_ACCOUNT_SUCCESS_REDIRECT_URL);
          });
        })
        .catch((err) => {
          logger.warn(`${getClientIp(req)} failed to create new account: ${err}`);
          return res.render('error', { message: err });
        });
    });

  app.route('/api/resetPassword')
    .post((req, res) => {
      if (!emailer) {
        logger.warn(`${getClientIp(req)} failed to reset password: Emailer is unavailable`);
        return res.render('error', { message: 'Emailer service not available!' });
      }

      const username = req.body.resetPasswordUsername;
      const email = req.body.resetPasswordEmail;

      if (!isValidUsername(username)) {
        logger.warn(`${getClientIp(req)} failed to reset password with username '${username}': Invalid username`);
        return res.render('error', { message: 'Invalid username!' });
      }

      if (!isValidEmail(email)) {
        logger.info(`${getClientIp(req)} failed to reset password with username '${username}' and email '${email}': Invalid email`);
        return res.render('error', { message: 'Invalid email!' });
      }

      return db.findUserByName(username)
        .then((user) => {
          if (user.email !== email) {
            logger.warn(`${getClientIp(req)} failed to reset password with username '${username}' and email '${email}': Email doesn't match current email ('${user.email}')`);
            return res.render('error', { message: "Email doesn't match current email!" });
          }

          return db.resetPassword(user.id)
            .then((newPassword) => {
              emailer.sendNewPassword(user.email, newPassword)
                .then(() => {
                  logger.info(`${getClientIp(req)} reset password`);
                  return res.render('info', {
                    title: 'Reset password',
                    header: 'Password reset!',
                    message: "An email with your new password has been sent. Don't forget to check your spam folder if it isn't in your inbox!",
                  });
                })
                .catch((err) => {
                  logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
                  return res.render('error', { message: err });
                });
            })
            .catch((err) => {
              logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
              return res.render('error', { message: err });
            });
        })
        .catch((err) => {
          logger.warn(`${getClientIp(req)} failed to reset password: ${err}`);
          return res.render('error', { message: err });
        });
    });

  app.route('/api/changePassword')
    .post(ensureAuthenticated, (req, res) => {
      const { currentPassword, newPassword, newPasswordAgain } = req.body;

      if (newPassword !== newPasswordAgain) {
        logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: New password doesn't match`);
        return res.render('error', {
          message: 'New password does not match!',
          goBackUrl: '/change_password.html',
        });
      }

      if (!isValidPassword(newPassword)) {
        logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: Invalid new password`);
        return res.render('error', {
          message: 'Passwords must be at least 6 characters long!',
          goBackUrl: '/change_password.html',
        });
      }

      return db.comparePassword(req.user.id, currentPassword)
        .then((match) => {
          if (match) {
            // Change password
            return db.changePassword(req.user.id, newPassword)
              .then(() => {
                // Logout user and redirect
                // FIXME: show a success toast/page and give warning of redirect
                req.logout();

                logger.info(`${getClientIp(req)} ('${req.user.username}') changed password`);

                res.render('info', {
                  title: 'Change password',
                  header: 'Password changed!',
                  message: 'You have been automatically logged out. Press the button below to go back to the main page and log back in!',
                });
              })
              .catch((err) => {
                logger.error(`${getClientIp(req)} db.changePassword error: ${err}`);
                return res.render('error', {
                  message: err,
                  goBackUrl: '/change_password.html',
                });
              });
          }

          logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to change password: Incorrect current password`);
          return res.render('error', {
            message: 'Incorrect password!',
            goBackUrl: '/change_password.html',
          });
        })
        .catch((err) => {
          logger.error(`${getClientIp(req)} db.comparePassword error: ${err}`);
          return res.render('error', { message: err });
        });
    });

  app.route('/api/makePost')
    .post(ensureAuthenticated, (req, res) => {
      const userId = req.user.id;
      let { userInput } = req.body;

      if (!isValidComment(userInput)) {
        logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to make post: Invalid post`);
        res.json({ error: 'Invalid post!' });
        return;
      }

      userInput = userInput.trim();

      db.makePost(userId, userInput)
        .then((post) => {
          logger.info(`${getClientIp(req)} ('${req.user.username}') made post #${post.id}`);

          const data = {
            userId,
            username: req.user.username,
            post,
          };

          return res.json(data);
        })
        .catch((err) => {
          logger.error(`${getClientIp(req)} ('${req.user.username}') db.makePost error: ${err}`);
          return res.json({ error: err });
        });
    });

  app.route('/api/editPost')
    .post(ensureAuthenticated, (req, res) => {
      const { postId } = req.body;
      let { editText } = req.body;

      if (!isValidComment(editText)) {
        logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to edit post #${postId}: Invalid edit`);
        return res.json({ error: 'Invalid edit!' });
      }

      editText = editText.trim();

      return db.findPost(postId)
        .then((post) => {
          if (post.user_id !== req.user.id) {
            logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to edit post #${postId}: Post belongs to another user. Note that this is highly suspicious behavior.`);
            return res.json({ error: "You can't edit other users' posts!" });
          }

          return db.editPost(postId, editText)
            .then((editedPost) => {
              logger.info(`${getClientIp(req)} ('${req.user.username}') edited post #${postId}`);
              return res.json(editedPost);
            })
            .catch((err) => {
              logger.error(`${getClientIp(req)} ('${req.user.username}') db.editPost error while trying to edit post #${postId}: ${err}`);
              return res.json({ error: err });
            });
        })
        .catch((err) => {
          logger.error(`${getClientIp(req)} ('${req.user.username}') db.findPost error while trying to find post #${postId}: ${err}`);
          return res.json({ error: err });
        });
    });

  app.route('/api/getPosts')
    .get(ensureAuthenticated, (req, res) => {
      db.getPosts()
        .then((posts) => {
          logger.info(`${getClientIp(req)} ('${req.user.username}') got all posts`);

          const data = {
            userId: req.user.id,
            posts,
          };

          return res.json(data);
        })
        .catch((err) => {
          logger.info(`${getClientIp(req)} ('${req.user.username}') db.getPosts error: ${err}`);
          return res.json({ error: err });
        });
    });

  app.route('/api/deletePost')
    .delete(ensureAuthenticated, (req, res) => {
      const { postId } = req.body;

      db.findPost(postId)
        .then((post) => {
          if (post.user_id !== req.user.id) {
            logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to delete post #${postId}: Post belongs to another user. Note that this is highly suspicious behavior.`);
            return res.json({ error: "You can't delete other users' posts!" });
          }

          return db.deletePost(postId)
            .then((success) => {
              logger.info(`${getClientIp(req)} ('${req.user.username}') deleted post #${postId}`);
              return res.json(success);
            })
            .catch((err) => {
              logger.error(`${getClientIp(req)} ('${req.user.username}') db.deletePost error: ${err}`);
              return res.json({ error: err });
            });
        })
        .catch((err) => {
          logger.error(`${getClientIp(req)} ('${req.user.username}') db.findPost error: ${err}`);
          return res.json({ error: err });
        });
    });

  app.route('/api/logout')
    .get(ensureAuthenticated, (req, res) => {
      const { username } = req.user;

      req.logout();

      logger.info(`${getClientIp(req)} ('${username}') logged out`);

      // We don't actually redirect because we use jQuery ajax in the client
      // side, and handling "real" redirects with that is a mess.
      res.json({ redirect: LOGOUT_REDIRECT_URL });
    });
}

exports.setupRoutes = setupRoutes;
