"use strict";

require("dotenv").config();
const passport = require("passport");
const { Pool } = require("pg");

// URL to which we redirect on login/authentication failure
const LOGIN_FAILURE_REDIRECT_URL = "/";

// Middleware which uses Passport's isAuthenticated to make sure a user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect(LOGIN_FAILURE_REDIRECT_URL);
}

// Takes an express app and sets up our routes
function setupRoutes(app) {
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

            if(username == "''" || password == "''") {
                res.json({error: "el nombre de usuario o la contraseña están vacíos"});
                return;
            }

            console.log("Alguien quiere crear una nueva cuenta con usuario " + username +
                        " y password " + password);

            const pool = new Pool();

            const query = {
                text: "SELECT * FROM users WHERE users.username = $1",
                values: [username],
            };
            
            // Find out if account already exists
            pool.query(query, (err, result) => {
                if(err) {
                    res.json({error: err});
                    return;
                }

                if(result.rows.length == 1) {
                    res.json({error: "username not available"});
                    return;
                }

                const query = {
                    text: "INSERT INTO users (username, password) VALUES ($1, $2)",
                    values: [username, password],
                };

                pool.query(query, (err, result) => {
                    if(err) {
                        res.json({error: err});
                        return;
                    }

                    res.json("usuario creado! Volvé a la página principal y loggeate");
                });
            });
        });

    app.route("/api/makePost")
        .post(ensureAuthenticated, (req, res) => {
            console.log("El usuario \"" + req.user.username + "\", con password \"" +
                        req.user.password +
                        "\" está por hacer el siguiente post: " + req.body.userInput);

            const pool = new Pool();

            const query = {
                text: "INSERT INTO posts (user_id, text) VALUES ($1, $2) RETURNING *",
                values: [req.user.id, req.body.userInput]
            };

            pool.query(query, (err, result) => {
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
            console.log("El usuario con id " + req.user.id + " está getteando los posts");

            const pool = new Pool();

            const query = {
                text: "SELECT posts.*, users.username FROM posts INNER JOIN users ON " +
                "posts.user_id = users.id ORDER BY posts.created_on DESC",
            };

            pool.query(query, (err, result) => {
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

            console.log("Alguien quiere borrar el post #" + postId);

            const pool = new Pool();

            const query = {
                text: "SELECT * FROM posts WHERE id = $1",
                values: [postId]
            }

            pool.query(query, (err, result) => {
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
                    res.json({error: "no podés borrar posts de otros usuarios!"});
                    return;
                }

                const query = {
                    text: "DELETE FROM posts WHERE id = $1",
                    values: [postId],
                };

                pool.query(query, (err, result) => {
                    if(err) {
                        res.json({error: "Server: no pude borrar el post #" + postId + ": " + err});
                        return;
                    }

                    res.json("Server: Borraste el post #" + postId);
                });
            });
        });
}

exports.setupRoutes = setupRoutes;
