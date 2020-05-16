const session           = require("express-session");
const passport          = require("passport");
const LocalStrategy     = require("passport-local");
const bcrypt            = require("bcrypt");

// Takes express app and sets up authentication with Passport
function setupAuthentication(app, db) {
    app.use(session({
        store: new (require('connect-pg-simple')(session))(),
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
        function(username, password, done) {
            console.log("Authenticating user \"" + username + "\"");

            db.findUserByName(username)
                .then((user) => {
                    bcrypt.compare(password, user.password, (err, match) => {
                        if(err) {
                            return done(err);
                        }
    
                        if(match) {
                            return done(null, user);
                        } else {
                            return done("Incorrect password!", false);
                        }
                    });
                })
                .catch((err) => {
                    return done(err);
                });
        }
    ));
}

exports.setupAuthentication = setupAuthentication;
