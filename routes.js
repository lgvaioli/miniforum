"use strict";

require("dotenv").config();

const passport = require("passport");

// URL to which we redirect on login/authentication failure
const LOGIN_FAILURE_REDIRECT_URL = "/";

// Middleware which uses Passport's isAuthenticated to make sure a user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect(LOGIN_FAILURE_REDIRECT_URL);
}

// Takes an express app and a MySQL db and sets up our routes
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
            const username = db.escape(req.body.accountUsername);
            const password = db.escape(req.body.accountPassword);

            if(username == "''" || password == "''") {
                res.json({error: "el nombre de usuario o la contraseña están vacíos"});
                return;
            }

            console.log("Alguien quiere crear una nueva cuenta con usuario " + username +
                        " y password " + password);
            
            // Find out if account already exists
            db.query("SELECT * FROM users WHERE users.username = " + username, (err, result) => {
                if(err) {
                    res.json({error: err});
                    return;
                }

                if(result.length == 1) {
                    res.json({error: "username not available"});
                    return;
                }

                const sql = "INSERT INTO users (username, password) VALUES (" +
                            username + ", " + password + ")";

                db.query(sql, (err, result) => {
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
            const userInput = db.escape(req.body.userInput);
            console.log("El usuario \"" + req.user.username + "\", con password \"" +
                        req.user.password + "\" está por hacer el siguiente post: " + userInput);

            const sql = "INSERT INTO posts (userID, text) VALUES (" + req.user.id + ", " +
                        userInput + ")";

            db.query(sql, (err, result) => {
                if(err) {
                    const errMsg = "Could not INSERT INTO: " + err;
                    console.log(errMsg);
                    res.json({error: errMsg});
                    return;
                }

                // Get the row we've just inserted
                db.query("SELECT posts.*, users.username FROM posts INNER JOIN users ON " +
                         "posts.userID = users.id WHERE posts.id = " + result.insertId,
                         (err, rows) => {
                    if(err) {
                        const errMsg = "Could not get inserted row: " + err;
                        console.log(errMsg);
                        res.json({error: errMsg});
                        return;
                    }

                    const data = {
                        userId: req.user.id,
                        post: rows[0]
                    }

                    res.json(data);
                });
            });
        });

    app.route("/api/getPosts")
        .get(ensureAuthenticated, (req, res) => {

            console.log("El usuario con id " + req.user.id + " está getteando los posts");

            // const sql = "SELECT * FROM posts ORDER BY created_on DESC";
            const sql = "SELECT posts.*, users.username FROM posts INNER JOIN users ON "
                        + "posts.userID = users.id ORDER BY posts.created_on DESC";

            db.query(sql, (err, result, fields) => {
                if(err) {
                    res.json({error: "Could not query database: " + err});
                    return;
                }

                const data = {
                    userId: req.user.id,
                    posts: result
                }

                res.json(data);
            });
        });

    app.route("/api/deletePost")
        .delete(ensureAuthenticated, (req, res) => {
            const postId = req.body.postId;

            console.log("Alguien quiere borrar el post #" + postId);

            const sql_select = "SELECT * FROM posts WHERE id = " + postId;

            db.query(sql_select, (err, result) => {
                if(err) {
                    res.json({error: err});
                    return;
                }

                if(result.length != 1) {
                    res.json({error: "invalid post id"});
                    return;
                }

                const post = result[0];

                if(post.userID != req.user.id) {
                    res.json({error: "no podés borrar posts de otros usuarios!"});
                    return;
                }

                const sql_delete = "DELETE FROM posts WHERE id = " + postId;

                db.query(sql_delete, (err, result) => {
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
