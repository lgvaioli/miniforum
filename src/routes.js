require('dotenv').config();
const passport = require('passport');
const {
  isValidUsername,
  isValidEmail,
  isValidPassword,
  isValidComment,
} = require('./validation');
const { Emailer } = require('./emailer');

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
function setupRoutes(app, db) {
  app.route('/')
    .get((req, res) => {
      res.sendFile('login.html', { root: process.env.PUBLIC_DIR });
    });

  app.route('/api/login')
    .post((req, res, next) => {
      passport.authenticate('local', (err, user) => {
        if (err) {
          return res.render('error', { message: err });
        }

        if (!user) {
          return res.render('error', { message: 'No login information!' });
        }

        return req.login(user, (loginErr) => {
          if (loginErr) {
            return res.render('error', { message: loginErr });
          }

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
      const username = req.body.accountUsername;
      const email = req.body.accountEmail;
      const password = req.body.accountPassword;

      if (!isValidUsername(username)) {
        return res.render('error', { message: 'Invalid username!' });
      }

      if (!isValidEmail(email)) {
        return res.render('error', { message: 'Invalid email!' });
      }

      if (!isValidPassword(password)) {
        return res.render('error', { message: 'Passwords must be at least 6 characters long!' });
      }

      console.log(`Trying to create new user account "${username}"`);

      return db.createUser(username, email, password)
        .then((user) => {
          req.login(user, (err) => {
            if (err) {
              console.log(`Error logging new user "${username}": ${err}`);
              return res.redirect(NEW_ACCOUNT_FAILURE_REDIRECT_URL);
            }

            return res.redirect(NEW_ACCOUNT_SUCCESS_REDIRECT_URL);
          });
        })
        .catch((err) => res.render('error', { message: err }));
    });

  app.route('/api/resetPassword')
    .post((req, res) => {
      const username = req.body.resetPasswordUsername;
      const email = req.body.resetPasswordEmail;

      if (!isValidUsername(username)) {
        return res.render('error', { message: 'Invalid username!' });
      }

      if (!isValidEmail(email)) {
        return res.render('error', { message: 'Invalid email!' });
      }

      return db.findUserByName(username)
        .then((user) => {
          if (user.email !== email) {
            return res.render('error', { message: "Email doesn't match username!" });
          }

          return db.resetPassword(user.id)
            .then((newPassword) => {
              Emailer.sendNewPassword(user.email, newPassword)
                .then(() => res.render('info', {
                  title: 'Reset password',
                  header: 'Password successfully reset!',
                  message: "An email with your new password has been sent. Don't forget to check your spam folder if it isn't in your inbox!",
                }))
                .catch((err) => res.render('error', { message: err }));
            })
            .catch((err) => res.render('error', { message: err }));
        })
        .catch((err) => res.render('error', { message: err }));
    });

  app.route('/api/changePassword')
    .post(ensureAuthenticated, (req, res) => {
      const { currentPassword, newPassword, newPasswordAgain } = req.body;

      if (newPassword !== newPasswordAgain) {
        return res.render('error', {
          message: 'New password does not match!',
          goBackUrl: '/change_password.html',
        });
      }

      if (!isValidPassword(newPassword)) {
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

                res.render('info', {
                  title: 'Change password',
                  header: 'Password successfully changed!',
                  message: 'You have been automatically logged out. Press the button below to go back to the main page and log back in!',
                });
              })
              .catch((err) => res.render('error', {
                message: err,
                goBackUrl: '/change_password.html',
              }));
          }

          return res.render('error', {
            message: 'Incorrect password!',
            goBackUrl: '/change_password.html',
          });
        })
        .catch((err) => res.render('error', { message: err }));
    });

  app.route('/api/makePost')
    .post(ensureAuthenticated, (req, res) => {
      const userId = req.user.id;
      let { userInput } = req.body;

      if (!isValidComment(userInput)) {
        res.json({ error: 'Invalid post!' });
        return;
      }

      userInput = userInput.trim();

      console.log(`User "${req.user.username}" is about to post the following: ${
        userInput}`);

      db.makePost(userId, userInput)
        .then((post) => {
          const data = {
            userId,
            username: req.user.username,
            post,
          };

          res.json(data);
        })
        .catch((err) => {
          res.json({ error: err });
        });
    });

  app.route('/api/editPost')
    .post(ensureAuthenticated, (req, res) => {
      const { postId } = req.body;
      let { editText } = req.body;

      if (!isValidComment(editText)) {
        res.json({
          error: 'invalid post. Posts must be at most 255 characters '
                         + "long and can't be all whitespace",
        });
        return;
      }

      editText = editText.trim();

      db.findPost(postId)
        .then((post) => {
          if (post.user_id !== req.user.id) {
            res.json({ error: "you can't edit other users' posts!" });
            return;
          }

          db.editPost(postId, editText)
            .then((editedPost) => {
              res.json(editedPost);
            })
            .catch((err) => {
              res.json({ error: err });
            });
        })
        .catch((err) => {
          res.json({ error: err });
        });
    });

  app.route('/api/getPosts')
    .get(ensureAuthenticated, (req, res) => {
      console.log(`User "${req.user.username}" is getting all posts`);

      db.getPosts()
        .then((posts) => {
          const data = {
            userId: req.user.id,
            posts,
          };

          res.json(data);
        })
        .catch((err) => {
          res.json({ error: err });
        });
    });

  app.route('/api/deletePost')
    .delete(ensureAuthenticated, (req, res) => {
      const { postId } = req.body;

      console.log(`User "${req.user.username}" is about to delete post #${postId}`);

      db.findPost(postId)
        .then((post) => {
          if (post.user_id !== req.user.id) {
            res.json({ error: "you can't delete other users' posts!" });
            return;
          }

          db.deletePost(postId)
            .then((success) => {
              res.json(success);
            })
            .catch((err) => {
              res.json({ error: err });
            });
        })
        .catch((err) => {
          res.json({ error: err });
        });
    });

  app.route('/api/logout')
    .get(ensureAuthenticated, (req, res) => {
      console.log(`User "${req.user.username}" is about to logout`);

      req.logout();

      // We don't actually redirect because we use jQuery ajax in the client
      // side, and handling "real" redirects with that is a mess.
      res.json({ redirect: LOGOUT_REDIRECT_URL });
    });
}

exports.setupRoutes = setupRoutes;
