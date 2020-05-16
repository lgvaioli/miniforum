"use strict";

require("dotenv").config();

const { Client }        = require("pg");
const bcrypt            = require("bcrypt");
const generatePassword  = require("password-generator");

const _Database = {
    findUserById: findUserById,
    findUserByName: findUserByName,
    createUser: createUser,
    resetPassword: resetPassword,
    findPost: findPost,
    makePost: makePost,
    editPost: editPost,
    getPosts: getPosts,
    deletePost: deletePost,
};

let client = null;

// Initializes the database.
// Returns a Promise which resolves to a database object on success, and rejects with
// an error on failure.
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_NO_SSL ? false : { rejectUnauthorized: false },
        });

        client.connect((err) => {
            if(err) {
                reject("Could not connect to database: " + err);
                return;
            }

            console.log("Connected successfully to database!");

            resolve(_Database);
        });
    });
}

// Finds a user in the database by id.
// Returns a Promise which resolves to the user if it exists, or rejects with an error
// if it doesn't.
function findUserById(id) {
    return new Promise((resolve, reject) => {
        const query = {
            text: "SELECT * FROM users WHERE id = $1",
            values: [id],
        };
    
        client.query(query, (err, res) => {
            if(err) {
                reject("Error while looking up user in database: " + err);
                return;
            }
    
            const user = res.rows[0];
    
            if(!user) {
                reject("user #" + id + " doesn't exist");
                return;
            }
    
            resolve(user);
        });
    });
}

// Finds a user in the database by name.
// Returns a Promise which resolves to the user if it exists, or rejects with an error
// if it doesn't.
function findUserByName(name) {
    return new Promise((resolve, reject) => {
        const query = {
            text: "SELECT * FROM users WHERE username = $1",
            values: [name]
        };

        client.query(query, (err, res) => {
            if(err) {
                reject(err);
                return;
            }

            const user = res.rows[0];

            if(!user) {
                reject("User doesn't exist!");
                return;
            }

            resolve(user);
        });
    });
}

// Creates a new user in the database.
// Resolves to the newly created user on success, fails with an error on failure (or if  a user
// with the same name already exists).
function createUser(username, email, password) {
    return new Promise((resolve, reject) => {
        findUserByName(username)
            .then((user) => {
                reject("user \"" + username + "\" already exists");
            })
            .catch((err) => {
                // Create user account. We store a hash instead of the plaintext password.
                bcrypt.hash(password, parseInt(process.env.BCRYPT_SALTROUNDS), (err, hash) => {
                    if(err) {
                        reject(err);
                        return;
                    }

                    const query = {
                        text: "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
                        values: [username, email, hash],
                    };
    
                    client.query(query, (err, result) => {
                        if(err) {
                            reject(err);
                            return;
                        }

                        // If we're here the new account was successfuly created. We resolve
                        // with the newly created user.
                        resolve(result.rows[0]);
                    });
                });
            });
    });
}

// Returns a Promise which resolves to a new password, or rejects with an error.
function resetPassword(userId) {
    return new Promise((resolve, reject) => {
        findUserById(userId)
            .then((user) => {
                // Default settings: memorable, 10 letters. It's not the strongest password
                // in the world, but it's fine for a temporary password which the user
                // should change right away anyway.
                const newPassword = generatePassword();

                bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALTROUNDS), (err, hash) => {
                    if(err) {
                        reject(err);
                        return;
                    }

                    // Update "password" (i.e. hash) in database
                    const query = {
                        text: "UPDATE users SET password = $1 WHERE id = $2",
                        values: [hash, user.id],
                    };

                    client.query(query, (err, result) => {
                        if(err) {
                            reject(err);
                            return;
                        }

                        // Query was successful, resolve promise to new password
                        resolve(newPassword);
                    });
                });
            })
            .catch((err) => {
                reject(err);
            });
    });
}

// Finds a post. Returns a Promise which resolves to the post if found, otherwise rejects
// with an error.
function findPost(postId) {
    return new Promise((resolve, reject) => {
        const query = {
            text: "SELECT * FROM posts WHERE id = $1",
            values: [postId],
        };

        client.query(query, (err, result) => {
            if(err) {
                reject(err);
                return;
            }

            const post = result.rows[0];

            if(!post) {
                reject("invalid post id");
                return;
            }

            resolve(post);
        });
    });
}

// Makes a post. Takes the userId and the text of the post.
// Returns a Promise which resolves to the new post (that is, the created database
// row consisting of id, text, created_on, and user_id) if successful, or rejects
// with an error on failure.
function makePost(userId, text) {
    return new Promise((resolve, reject) => {
        const query = {
            text: "INSERT INTO posts (user_id, text) VALUES ($1, $2) RETURNING *",
            values: [userId, text]
        };
    
        client.query(query, (err, result) => {
            if(err) {
                reject("Could not INSERT INTO: " + err);
                return;
            }

            resolve(result.rows[0]);
        });
    });
}

// Edits (UPDATEs) a post.
// Returns a Promise which resolves to the edited post, or rejects with an error.
function editPost(postId, text) {
    return new Promise((resolve, reject) => {
        const query = {
            text: "UPDATE posts SET text = $1, created_on = NOW() WHERE id = $2 RETURNING *",
            values: [text, postId],
        };

        client.query(query, (err, result) => {
            if(err) {
                reject("Could not UPDATE: " + err);
                return;
            }

            resolve(result.rows[0]);
        });
    });
}

// Gets all the posts in created_on descending order.
// Returns a Promise which resolves to an array of posts inner joined with users.username
// on success, rejects with an error on failure.
function getPosts() {
    return new Promise((resolve, reject) => {
        const query = {
            text: "SELECT posts.*, users.username FROM posts INNER JOIN users ON " +
            "posts.user_id = users.id ORDER BY posts.id DESC",
        };

        client.query(query, (err, result) => {
            if(err) {
                console.log("Error: " + err);
                reject(err);
                return;
            }

            resolve(result.rows);
        });
    });
}

// Deletes a post. Returns a Promise which resolves to a success string if successful, or
// rejects with an error.
function deletePost(postId) {
    return new Promise((resolve, reject) => {
        const query = {
            text: "DELETE FROM posts WHERE id = $1",
            values: [postId],
        };

        client.query(query, (err, result) => {
            if(err) {
                reject("Could not DELETE post #" + postId + ": " + err);
                return;
            }

            resolve("Deleted post #" + postId);
        });
    });
}

exports.initializeDatabase = initializeDatabase;
