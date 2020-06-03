const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const connectPgSimple = require('connect-pg-simple');
const { getLogger } = require('./logger');

const logger = getLogger();

// Takes express app and sets up authentication with Passport
function setupAuthentication(app, db) {
  const connectPgSimpleStore = new (connectPgSimple(session))();

  app.use(session({
    store: connectPgSimpleStore,
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  /**
   * Graceful error handling middleware. I ran into a nasty deserializeUser "bug" (not technically
   * a bug, just... awful behavior): If a logged-in user is removed from the database and then
   * tries to go to the page without deleting his cookie, deserializeUser fails (obviously, because
   * the user no longer exists in the database so findUserById rejects with an error) and an
   * ugly HTML stacktrace is returned to the user.
   * With this middleware, the user is forcefully logged out, and redirected to the login page.
   */
  app.use((err, req, res, next) => {
    if (err) {
      req.logout();

      // Avoids infinite loops
      if (req.originalUrl === '/') {
        next();
      } else {
        // res.redirect('/');
        res.render('error', { message: err });
      }
    } else {
      next();
    }
  });

  // Passport (de)serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    db.findUserById(id)
      .then((user) => {
        done(null, user);
      })
      .catch((err) => {
        done(err);
      });
  });

  // Passport local strategy
  passport.use(new LocalStrategy(
    ((username, password, done) => {
      db.findUserByName(username)
        .then((user) => {
          if (!user) {
            return done(`failed to log in as '${username}': User doesn't exist`, false);
          }

          return bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
              logger.error(`bcrypt.compare error while trying to log in user '${username}': ${err}`);
              return done(err);
            }

            if (match) {
              return done(null, user);
            }

            return done(`failed to log in as user '${username}': Incorrect password`, false);
          });
        })
        .catch((err) => {
          logger.error(`db.findUserByName error while trying to log in user '${username}': ${err}`);
          return done(err);
        });
    }),
  ));
}

exports.setupAuthentication = setupAuthentication;
