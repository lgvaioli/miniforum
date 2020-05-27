/* eslint-disable no-use-before-define */
/* eslint-disable prefer-promise-reject-errors */
// FIXME: I plan to get rid of these eslint hacks when I refactor this whole file

require('dotenv').config();

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const generatePassword = require('password-generator');
const { getLogger } = require('./logger');

const logger = getLogger();
let database = null;
let client = null;

/**
 * Initializes the database.
 * Returns a Promise which resolves to a database object on success, and rejects with
 * an error on failure.
 */
function getDatabase() {
  return new Promise((resolve, reject) => {
    if (client) {
      return resolve(database);
    }

    let noSsl = false;

    if (process.env.DATABASE_NO_SSL && process.env.DATABASE_NO_SSL === 'true') {
      noSsl = true;
    }

    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: noSsl ? false : { rejectUnauthorized: false },
    });

    return client.connect((err) => {
      if (err) {
        const errMsg = `Client could not connect to database: ${err}`;
        logger.error(errMsg);
        return reject(errMsg);
      }

      logger.info('Client successfully connected to database');

      if (!database) {
        database = {
          findUserById,
          findUserByName,
          createUser,
          changePassword,
          comparePassword,
          resetPassword,
          findPost,
          makePost,
          editPost,
          getPosts,
          deletePost,
          clearPosts,
          close: closeDatabase,
        };
      }

      return resolve(database);
    });
  });
}

/**
 * Finds a user in the database by id.
 * Returns a Promise which resolves to the user if it exists, or rejects with an error
 * if it doesn't.
 */
function findUserById(id) {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'SELECT * FROM users WHERE id = $1',
      values: [id],
    };

    client.query(query, (err, res) => {
      if (err) {
        return reject(`Error while looking up user in database: ${err}`);
      }

      const user = res.rows[0];

      if (!user) {
        return reject(`user #${id} doesn't exist`);
      }

      return resolve(user);
    });
  });
}

/**
 * Finds a user in the database by name.
 * Returns a Promise which resolves to the user if it exists, to null if it doesn't, and rejects
 * with an error if an error occurs while querying the database.
 */
function findUserByName(name) {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'SELECT * FROM users WHERE username = $1',
      values: [name],
    };

    client.query(query, (err, res) => {
      if (err) {
        return reject(err);
      }

      const user = res.rows[0];

      if (!user) {
        return resolve(null);
      }

      return resolve(user);
    });
  });
}

/**
 * Creates a new user in the database.
 * Resolves to the newly created user on success, to null if the user already exists, and
 * rejects with an error if there was any other problem.
 */
function createUser(username, email, password) {
  return new Promise((resolve, reject) => {
    findUserByName(username)
      .then((user) => {
        // User already exists, resolve to null
        if (user) {
          return resolve(null);
        }

        // User doesn't exist, create account. We store a hash instead of the plaintext password.
        return bcrypt.hash(password, parseInt(process.env.BCRYPT_SALTROUNDS, 10), (err, hash) => {
          if (err) {
            return reject(err);
          }

          const query = {
            text: 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
            values: [username, email, hash],
          };

          return client.query(query, (dbErr, result) => {
            if (dbErr) {
              return reject(dbErr);
            }

            // New account was successfuly created. Resolve to new user.
            return resolve(result.rows[0]);
          });
        });
      })
      .catch((err) => reject(err));
  });
}

/**
 * Changes a user's password, i.e., takes newPassword, hashes it, and stores the hash
 * in the database.
 * Resolves to newPassword on success or rejects with an error.
 */
function changePassword(userId, newPassword) {
  return new Promise((resolve, reject) => {
    findUserById(userId)
      .then((user) => {
        bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALTROUNDS, 10), (err, hash) => {
          if (err) {
            return reject(err);
          }

          // Update "password" (i.e. hash) in database
          const query = {
            text: 'UPDATE users SET password = $1 WHERE id = $2',
            values: [hash, user.id],
          };

          return client.query(query, (dbErr) => {
            if (dbErr) {
              return reject(dbErr);
            }

            // Query was successful, resolve promise to new password
            return resolve(newPassword);
          });
        });
      })
      .catch((err) => reject(err));
  });
}

// Returns a Promise which resolves to a new password, or rejects with an error.
function resetPassword(userId) {
  /**
   * Default settings: memorable, 10 letters. It's not the strongest password
   * in the world, but it's fine for a temporary password which the user
   * should change right away anyway.
   */
  return changePassword(userId, generatePassword());
}

/**
 * Compares password to the user's stored password.
 * Returns a Promise which resolves to true if the passwords match, or to false if they don't
 * match, and which rejects if an error occurs.
 */
function comparePassword(userId, password) {
  return new Promise((resolve, reject) => {
    findUserById(userId)
      .then((user) => {
        // User exists, get password
        const query = {
          text: 'SELECT * FROM users WHERE id = $1',
          values: [user.id],
        };

        client.query(query, (err, result) => {
          if (err) {
            return reject(err);
          }

          const userRow = result.rows[0];

          // Compare passwords
          return bcrypt.compare(password, userRow.password, (compareErr, match) => {
            if (compareErr) {
              return reject(compareErr);
            }

            if (match) {
              // Passwords match, resolve to true
              return resolve(true);
            }

            // Passwords don't match, resolve to false
            return resolve(false);
          });
        });
      })
      .catch((err) => reject(err));
  });
}

/**
 * Finds a post. Returns a Promise which resolves to the post if found, otherwise rejects
 * with an error.
 */
function findPost(postId) {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'SELECT * FROM posts WHERE id = $1',
      values: [postId],
    };

    client.query(query, (err, result) => {
      if (err) {
        return reject(err);
      }

      const post = result.rows[0];

      if (!post) {
        return reject('Invalid post id!');
      }

      return resolve(post);
    });
  });
}

/**
 * Makes a post. Takes the userId and the text of the post.
 * Returns a Promise which resolves to the new post (that is, the created database
 * row consisting of id, text, created_on, and user_id) if successful, or rejects
 * with an error on failure.
 */
function makePost(userId, text) {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'INSERT INTO posts (user_id, text) VALUES ($1, $2) RETURNING *',
      values: [userId, text],
    };

    client.query(query, (err, result) => {
      if (err) {
        return reject(`Could not INSERT INTO: ${err}`);
      }

      return resolve(result.rows[0]);
    });
  });
}

/**
 * Edits (UPDATEs) a post.
 * Returns a Promise which resolves to the edited post, or rejects with an error.
 */
function editPost(postId, text) {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'UPDATE posts SET text = $1, created_on = NOW() WHERE id = $2 RETURNING *',
      values: [text, postId],
    };

    client.query(query, (err, result) => {
      if (err) {
        reject(`Could not UPDATE: ${err}`);
        return;
      }

      resolve(result.rows[0]);
    });
  });
}

/**
 * Gets all the posts in created_on descending order.
 * Returns a Promise which resolves to an array of posts inner joined with users.username
 * on success, rejects with an error on failure.
 */
function getPosts() {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'SELECT posts.*, users.username FROM posts INNER JOIN users ON '
            + 'posts.user_id = users.id ORDER BY posts.id DESC',
    };

    client.query(query, (err, result) => {
      if (err) {
        return reject(err);
      }

      return resolve(result.rows);
    });
  });
}

/**
 * Deletes a post. Returns a Promise which resolves to a success string if successful, or
 * rejects with an error.
 */
function deletePost(postId) {
  return new Promise((resolve, reject) => {
    const query = {
      text: 'DELETE FROM posts WHERE id = $1',
      values: [postId],
    };

    client.query(query, (err) => {
      if (err) {
        return reject(`Could not DELETE post #${postId}: ${err}`);
      }

      return resolve(`Deleted post #${postId}`);
    });
  });
}

/**
 * Clears (deletes) all posts from the database. Returns a Promise which resolves to a
 * success string on success, or rejects with an error.
 */
function clearPosts() {
  return new Promise((resolve, reject) => {
    client.query('DELETE FROM posts', (err) => {
      if (err) {
        return reject(err);
      }

      return resolve('cleared posts');
    });
  });
}

// Ends database client connection.
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (client) {
      client.end((err) => {
        if (err) {
          const errMsg = `Could not disconnect database client: ${err}`;
          logger.error(errMsg);
          return reject(errMsg);
        }

        client = null;
        const msg = 'Successfully disconnected database client';
        logger.info(msg);
        return resolve(msg);
      });
    }

    const msg = 'Tried to disconnect uninitialized database client';
    logger.warn(msg);
    return reject(msg);
  });
}

exports.getDatabase = getDatabase;
