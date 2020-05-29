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
