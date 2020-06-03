require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const faker = require('faker');

class Database {
  /**
   * Class constructor; creates a new database connection. You should immediately
   * call isConnected after this, to ensure that the database is properly connected.
   * @param {String} databaseUrl A database URL to connect to.
   * See https://www.npmjs.com/package/pg-connection-string for more info.
   */
  constructor(databaseUrl) {
    let noSsl = false;

    if (process.env.DATABASE_NO_SSL && process.env.DATABASE_NO_SSL === 'true') {
      noSsl = true;
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: noSsl ? false : { rejectUnauthorized: false },
    });
  }

  /**
   * Checks the database connection.
   * @returns {Promise} Resolves to true if a connection is established, or rejects with an Error.
   */
  isConnected() {
    return new Promise((resolve, reject) => {
      /**
       * Make dumb query to check if we successfully connected to the database.
       * I couldn't find a proper way to do this; PG's docs kinda suck.
       */
      this.pool.query('SELECT NOW()', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Finds a user in the database by ID.
   * @param {Number} id The user ID.
   * @returns {Promise} Resolves to a user row { id, username, password, email } on success,
   * or rejects with an Error.
   */
  findUserById(id) {
    return new Promise((resolve, reject) => {
      const queryObj = {
        text: 'SELECT * FROM users WHERE id = $1',
        values: [id],
      };

      this.pool.query(queryObj, (err, res) => {
        if (err) {
          return reject(err);
        }

        const user = res.rows[0];

        if (!user) {
          return reject(new Error(`User #${id} doesn't exist`));
        }

        return resolve(user);
      });
    });
  }

  /**
   * Finds a user in the database by name.
   * @param {String} name The user name.
   * @returns {Promise} Resolves to a user row { id, username, password, email } on success,
   * or rejects with an Error.
   */
  findUserByName(name) {
    return new Promise((resolve, reject) => {
      const queryObj = {
        text: 'SELECT * FROM users WHERE username = $1',
        values: [name],
      };

      this.pool.query(queryObj, (err, res) => {
        if (err) {
          return reject(err);
        }

        const user = res.rows[0];

        if (!user) {
          return reject(new Error(`User '${name}' doesn't exist`));
        }

        return resolve(user);
      });
    });
  }

  /**
   * Creates a new user in the database.
   * @param {Object} newUser New user data, must be an object { username, password, email }.
   * @returns {Promise} Resolves to a user row { id, username, password, email } on success,
   * or rejects with an Error.
   */
  createUser(newUser) {
    return new Promise((resolve, reject) => {
      this.findUserByName(newUser.username)
        .then((user) => reject(new Error(`User '${user.username}' already exists`)))
        // eslint-disable-next-line arrow-body-style
        .catch(() => {
          // User doesn't exist, create account. We store a hash instead of the plaintext password.
          return bcrypt.hash(newUser.password, parseInt(process.env.BCRYPT_SALTROUNDS, 10),
            (err, hash) => {
              if (err) {
                return reject(err);
              }

              const queryObj = {
                text: 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
                values: [newUser.username, newUser.email, hash],
              };

              return this.pool.query(queryObj, (dbErr, result) => {
                if (dbErr) {
                  return reject(dbErr);
                }

                // New account was successfuly created. Resolve to new user.
                return resolve(result.rows[0]);
              });
            });
        });
    });
  }

  /**
   * Changes a user password.
   * @param {Number} userId The user ID.
   * @param {String} newPassword The new password.
   * @return {Promise} Resolves to new password on success, or rejects with an Error.
   */
  changePassword(userId, newPassword) {
    return new Promise((resolve, reject) => {
      this.findUserById(userId)
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

            return this.pool.query(query, (dbErr) => {
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

  /**
   * Resets a user's password, i.e., it creates a new password and calls changePassword on it.
   * @param {Number} userId The user ID.
   * @returns {Promise} Resolves to the new password, or rejects with an Error.
   */
  resetPassword(userId) {
    /**
     * Faker seems to generate decent enough passwords (16 characters long, alphanumeric, with
     * some special characters). This is probably not ideal from a security point of view because
     * faker is probably not truly random or whatever, but the fact is: 1) these passwords are
     * probably stronger than 90% of actual internet passwords; 2) the user should change this
     * to a password of his preference after logging in anyway.
     */
    return this.changePassword(userId, faker.internet.password());
  }

  /**
   * Compares a password with the user's password.
   * @param {Number} userId The user ID.
   * @param {String} password The password to compare.
   * @returns {Promise} Resolves to true if the passwords match, or to false if they don't
   * match; if an error occurs, rejects with an Error.
   */
  comparePassword(userId, password) {
    return new Promise((resolve, reject) => {
      this.findUserById(userId)
        .then((user) => {
          // User exists, get password
          const query = {
            text: 'SELECT * FROM users WHERE id = $1',
            values: [user.id],
          };

          this.pool.query(query, (err, result) => {
            if (err) {
              return reject(err);
            }

            const userRow = result.rows[0];

            // Compare passwords
            return bcrypt.compare(password, userRow.password, (compareErr, match) => {
              if (compareErr) {
                return reject(compareErr);
              }

              return resolve(match);
            });
          });
        })
        .catch((err) => reject(err));
    });
  }

  /**
   * Finds a post by id.
   * @param {Number} postId The post ID.
   * @returns {Promise} Resolves to a post row { id, text, created_on, user_id } if found,
   * otherwise rejects with an Error.
   */
  findPost(postId) {
    return new Promise((resolve, reject) => {
      const query = {
        text: 'SELECT * FROM posts WHERE id = $1',
        values: [postId],
      };

      this.pool.query(query, (err, result) => {
        if (err) {
          return reject(err);
        }

        const post = result.rows[0];

        if (!post) {
          return reject(new Error(`Post #${postId} doesn't exist`));
        }

        return resolve(post);
      });
    });
  }

  /**
   * Makes a post.
   * @param {Number} userId ID of the user who is making the post.
   * @param {String} text Text of the post.
   * @returns {Promise} Resolves to a post row { id, text, created_on, user_id } if
   * successful, or rejects with an Error.
   */
  makePost(userId, text) {
    return new Promise((resolve, reject) => {
      const query = {
        text: 'INSERT INTO posts (user_id, text) VALUES ($1, $2) RETURNING *',
        values: [userId, text],
      };

      this.pool.query(query, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result.rows[0]);
      });
    });
  }

  /**
   * Edits a post.
   * @param {Number} postId ID of the post to edit.
   * @param {String} text The new text.
   * @returns {Promise} Resolves to a post row { id, text, created_on, user_id } if
   * successful, or rejects with an Error.
   */
  editPost(postId, text) {
    return new Promise((resolve, reject) => {
      const query = {
        text: 'UPDATE posts SET text = $1, created_on = NOW() WHERE id = $2 RETURNING *',
        values: [text, postId],
      };

      this.pool.query(query, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result.rows[0]);
      });
    });
  }

  /**
   * Gets all the posts in created_on descending order.
   * @returns {Promise} Resolves to an array of posts inner joined with users.username
   * rows, i.e. { id, text, created_on, user_id, username } on success, or rejects with an Error.
   */
  getPosts() {
    return new Promise((resolve, reject) => {
      const query = {
        text: 'SELECT posts.*, users.username FROM posts INNER JOIN users ON posts.user_id = users.id ORDER BY posts.id DESC',
      };

      this.pool.query(query, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result.rows);
      });
    });
  }

  /**
   * Deletes a post.
   * @param {Number} postId The post ID.
   * @returns {Promise} Resolves to a success string if successful, or rejects with an Error.
   */
  deletePost(postId) {
    return new Promise((resolve, reject) => {
      const query = {
        text: 'DELETE FROM posts WHERE id = $1',
        values: [postId],
      };

      this.pool.query(query, (err) => {
        if (err) {
          return reject(err);
        }

        return resolve(`Deleted post #${postId}`);
      });
    });
  }

  /**
   * Clears (deletes) all posts from the database. Useful for testing.
   * @returns {Promise} Resolves to a success string if successful, or rejects with an Error.
   */
  clearPosts() {
    return new Promise((resolve, reject) => {
      this.pool.query('DELETE FROM posts', (err) => {
        if (err) {
          return reject(err);
        }

        return resolve('cleared posts');
      });
    });
  }

  /**
   * Clears (deletes) all users and posts from the database. Useful for testing.
   * @returns {Promise} Resolves to a success string if successful, or rejects with an Error.
   */
  clearAll() {
    return new Promise((resolve, reject) => {
      this.pool.query('DELETE FROM posts', (err) => {
        if (err) {
          return reject(err);
        }

        return this.pool.query('DELETE FROM users', (err2) => {
          if (err2) {
            return reject(err2);
          }

          return resolve('cleared all');
        });
      });
    });
  }

  /**
   * Closes database connection.
   */
  close() {
    this.pool.end();
  }
}

exports.Database = Database;
