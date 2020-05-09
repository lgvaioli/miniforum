const session           = require("express-session");
const passport          = require("passport");
const LocalStrategy     = require("passport-local");
const { Pool }          = require("pg");

// Takes express app and sets up authentication with Passport
function setupAuthentication(app) {
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
        const pool = new Pool();
        
        const query = {
            text: "SELECT * FROM users WHERE id = $1",
            values: [id],
        };

        pool.query(query, (err, res) => {
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
            console.log("Autenticando usuario \"" + username + "\", con password \""
                        + password + "\"");

            const pool = new Pool();

            const query = {
                text: "SELECT * FROM users WHERE username = $1",
                values: [username]
            };

            pool.query(query, (err, res) => {
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
