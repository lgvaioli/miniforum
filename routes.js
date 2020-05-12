"use strict";

require("dotenv").config();
const passport          = require("passport");
const isValidUsername   = require("./validation.js").isValidUsername;
const isValidPassword   = require("./validation.js").isValidPassword;
const isValidComment    = require("./validation.js").isValidComment;
const bcrypt            = require("bcrypt");

// Redirect URLs
const LOGIN_FAILURE_REDIRECT_URL = "/";
const NEW_ACCOUNT_SUCCESS_REDIRECT_URL = "/forum";
const NEW_ACCOUNT_FAILURE_REDIRECT_URL = "/";
const LOGOUT_REDIRECT_URL = "/"; 

// Middleware which uses Passport's isAuthenticated to make sure a user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect(LOGIN_FAILURE_REDIRECT_URL);
}

// Takes an express app and sets up our routes
function setupRoutes(app, db) {
    app.route("/")
        .get((req, res) => {
            res.sendFile("login.html", {root: process.env.PUBLIC_DIR});
        });

    app.route("/login")
        .post(passport.authenticate("local", {failureRedirect: LOGIN_FAILURE_REDIRECT_URL}),
             (req, res) => {
            res.redirect("/forum");
        });

    app.route("/forum")
        .get(ensureAuthenticated, (req, res) => {
            res.sendFile("forum.html", {root: process.env.PUBLIC_DIR});
        });

    app.route("/api/newAccount")
        .post((req, res) => {
            const username = req.body.accountUsername;
            const password = req.body.accountPassword;

            if(!isValidUsername(username)) {
                res.json({error: "invalid username. Valid usernames are between 1 " +
                    "and 20 characters in length, and may only contain the following " +
                    "characters:  a-z, A-Z, 0-9, - (dash), and _ (underscore)"});
                return;
            }

            if(!isValidPassword(password)) {
                res.json({error: "passwords must be at least 6 characters long"});
                return;
            }

            console.log("Trying to create new user account \"" + username + "\"");

            const query = {
                text: "SELECT * FROM users WHERE users.username = $1",
                values: [username],
            };
            
            // Find out if account already exists
            db.query(query, (err, result) => {
                if(err) {
                    res.json({error: err});
                    return;
                }

                if(result.rows.length == 1) {
                    res.json({error: "username not available"});
                    return;
                }

                // Create user account. We store a hash instead of the plaintext password.
                bcrypt.hash(password, parseInt(process.env.BCRYPT_SALTROUNDS), (err, hash) => {
                    if(err) {
                        res.json({error: err.toString()});
                        return;
                    }

                    const query = {
                        text: "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
                        values: [username, hash],
                    };
    
                    db.query(query, (err, result) => {
                        if(err) {
                            res.json({error: err});
                            return;
                        }

                        // If we're here the new account was successfuly created. We authenticate
                        // it with Passport and redirect.
                        const user = {
                            username: username,
                            password: hash,
                            id: result.rows[0].id,
                        };

                        req.login(user, (err) => {
                            if(err) {
                                console.log("Error logging new user \"" + username + "\": " + err);
                                res.redirect(NEW_ACCOUNT_FAILURE_REDIRECT_URL);
                                return;
                            }

                            res.redirect(NEW_ACCOUNT_SUCCESS_REDIRECT_URL);
                        });
                    });
                });
            });
        });

    app.route("/api/makePost")
        .post(ensureAuthenticated, (req, res) => {
            let userInput = req.body.userInput;

            if(!isValidComment(userInput)) {
                res.json({error: "invalid post. Posts must be at most 255 characters " +
                         "long and can't be all whitespace"});
                return;
            }

            userInput = userInput.trim();

            console.log("User \"" + req.user.username + "\" is about to post the following: " +
                        userInput);

            const query = {
                text: "INSERT INTO posts (user_id, text) VALUES ($1, $2) RETURNING *",
                values: [req.user.id, userInput]
            };

            db.query(query, (err, result) => {
                if(err) {
                    const errMsg = "Could not INSERT INTO: " + err;
                    console.log(errMsg);
                    res.json({error: errMsg});
                    return;
                }

                const data = {
                    userId: req.user.id,
                    username: req.user.username,
                    post: result.rows[0],
                };

                res.json(data);
            });
        });

    app.route("/api/getPosts")
        .get(ensureAuthenticated, (req, res) => {
            console.log("User \"" + req.user.username + "\" is getting all posts");

            const query = {
                text: "SELECT posts.*, users.username FROM posts INNER JOIN users ON " +
                "posts.user_id = users.id ORDER BY posts.created_on DESC",
            };

            db.query(query, (err, result) => {
                if(err) {
                    res.json({error: "Could not query database: " + err});
                    return;
                }

                const data = {
                    userId: req.user.id,
                    posts: result.rows
                }

                res.json(data);
            });
        });

    app.route("/api/deletePost")
        .delete(ensureAuthenticated, (req, res) => {
            const postId = req.body.postId;

            console.log("User \"" + req.user.username + "\" is about to delete post #" + postId);

            const query = {
                text: "SELECT * FROM posts WHERE id = $1",
                values: [postId]
            }

            db.query(query, (err, result) => {
                if(err) {
                    res.json({error: err});
                    return;
                }

                if(result.rows.length != 1) {
                    res.json({error: "invalid post id"});
                    return;
                }

                const post = result.rows[0];

                if(post.user_id != req.user.id) {
                    res.json({error: "you can't delete other users' posts!"});
                    return;
                }

                const query = {
                    text: "DELETE FROM posts WHERE id = $1",
                    values: [postId],
                };

                db.query(query, (err, result) => {
                    if(err) {
                        res.json({error: "Server: Could not delete post #" + postId + ": " + err});
                        return;
                    }

                    res.json("Server: You deleted post #" + postId);
                });
            });
        });

    app.route("/api/logout")
        .get(ensureAuthenticated, (req, res) => {
            console.log("User \"" + req.user.username + "\" is about to logout");

            req.logout();

            // We don't actually redirect because we use jQuery ajax in the client
            // side, and handling "real" redirects with that is a mess.
            res.json({redirect: LOGOUT_REDIRECT_URL});
        });
}

exports.setupRoutes = setupRoutes;
