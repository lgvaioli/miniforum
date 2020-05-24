require('dotenv').config();
const passport = require('passport');
const { isValidUsername } = require('./validation.js');
const { isValidEmail } = require('./validation.js');
const { isValidPassword } = require('./validation.js');
const { isValidComment } = require('./validation.js');
const { Emailer } = require('./emailer.js');

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

  app.route('/login')
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

  app.route('/api/recovery')
    .post((req, res) => {
      const username = req.body.recoveryUsername;
      const email = req.body.recoveryEmail;

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
                .then(() => {
                  const msg = 'An email with your new password has been sent. '
                                                + "Don't forget to check your spam folder if it isn't "
                                                + 'in your inbox!';
                  return res.render('resetPassword', { message: msg });
                })
                .catch((err) => res.render('error', { message: err }));
            })
            .catch((err) => res.render('error', { message: err }));
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
