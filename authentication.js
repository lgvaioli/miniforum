const session           = require("express-session");
const passport          = require("passport");
const LocalStrategy     = require("passport-local");

// Takes express app and sets up authentication with Passport
function setupAuthentication(app, db) {
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true
    }))

    app.use(passport.initialize());
    app.use(passport.session());

    // Passport (de)serialization
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        const query = {
            text: "SELECT * FROM users WHERE id = $1",
            values: [id],
        };

        db.query(query, (err, res) => {
            if(err) {
                return done(err);
            }

            const user = res.rows[0];

            if(!user) {
                return done("user doesn't exist");
            }

            done(null, user);
        })
    });

    // Passport local strategy
    passport.use(new LocalStrategy(
        function(username, password, done) {
            console.log("Authenticating user \"" + username + "\"");

            const query = {
                text: "SELECT * FROM users WHERE username = $1",
                values: [username]
            };

            db.query(query, (err, res) => {
                if(err) {
                    return done(err);
                }

                const user = res.rows[0];

                if(!user) {
                    return done("user doesn't exist", false);
                }

                if(password !== user.password) {
                    return done("incorrect password", false);
                }

                return done(null, user);
            });
        }
    ));
}

exports.setupAuthentication = setupAuthentication;
