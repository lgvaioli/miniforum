require('dotenv').config();
const express = require('express');
const { getClientIp } = require('request-ip');
const { Validator } = require('../validator');
const { getLogger } = require('../logger');
const { ensureAuthenticated } = require('../authentication');
const { POST_BATCH_SIZE } = require('../globals');

const logger = getLogger();
const router = express.Router();

function init(database) {
  // POST makes a forum post.
  router.post('/', ensureAuthenticated, (req, res) => {
    const userId = req.user.id;
    let { userInput } = req.body;

    if (!Validator.checkComment(userInput)) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to make post: Invalid post`);
      res
        .status(422)
        .json({ error: 'Invalid post!' });
      return;
    }

    userInput = userInput.trim();

    database
      .makePost(userId, userInput)
      .then((post) => {
        logger.info(`${getClientIp(req)} ('${req.user.username}') made post #${post.id}`);

        const data = {
          userId,
          username: req.user.username,
          post,
        };

        return res
          .status(200)
          .json(data);
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} ('${req.user.username}') database.makePost error: ${err}`);
        return res
          .status(500)
          .json({ error: err.toString() });
      });
  });

  // PUT updates (edits) a forum post.
  router.put('/', ensureAuthenticated, (req, res) => {
    const { postId } = req.body;
    let { editText } = req.body;

    if (!Validator.checkComment(editText)) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to edit post #${postId}: Invalid edit`);
      return res
        .status(422)
        .json({ error: 'Invalid edit!' });
    }

    editText = editText.trim();

    return database
      .findPost(postId)
      .then((post) => {
        if (post.user_id !== req.user.id) {
          logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to edit post #${postId}: Post belongs to another user. Note that this is highly suspicious behavior.`);
          return res
            .status(401)
            .json({ error: "You can't edit other users' posts!" });
        }

        return database
          .editPost(postId, editText)
          .then((editedPost) => {
            logger.info(`${getClientIp(req)} ('${req.user.username}') edited post #${postId}`);
            return res
              .status(200)
              .json(editedPost);
          })
          .catch((err) => {
            logger.error(`${getClientIp(req)} ('${req.user.username}') database.editPost error while trying to edit post #${postId}: ${err}`);
            return res
              .status(500)
              .json({ error: err.toString() });
          });
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} ('${req.user.username}') database.findPost error while trying to find post #${postId}: ${err}`);
        return res
          .status(500)
          .json({ error: err.toString() });
      });
  });

  // DELETE deletes a forum post.
  router.delete('/', ensureAuthenticated, (req, res) => {
    const { postId } = req.body;

    database
      .findPost(postId)
      .then((post) => {
        if (post.user_id !== req.user.id) {
          logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to delete post #${postId}: Post belongs to another user. Note that this is highly suspicious behavior.`);
          return res
            .status(401)
            .json({ error: "You can't delete other users' posts!" });
        }

        return database
          .deletePost(postId)
          .then((success) => {
            logger.info(`${getClientIp(req)} ('${req.user.username}') deleted post #${postId}`);
            return res
              .status(200)
              .json(success);
          })
          .catch((err) => {
            logger.error(`${getClientIp(req)} ('${req.user.username}') database.deletePost error: ${err}`);
            return res
              .status(500)
              .json({ error: err.toString() });
          });
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} ('${req.user.username}') database.findPost error: ${err}`);
        return res
          .status(500)
          .json({ error: err.toString() });
      });
  });

  // GET returns all forum posts.
  router.get('/', ensureAuthenticated, (req, res) => {
    let fromId;

    if (req.query.fromId) {
      fromId = parseInt(req.query.fromId, 10);

      if (Number.isNaN(fromId)) {
        fromId = undefined;
      }
    }

    database
      .getPosts(POST_BATCH_SIZE, fromId)
      .then((posts) => {
        logger.info(`${getClientIp(req)} ('${req.user.username}') got posts`);

        const data = {
          userId: req.user.id,
          posts,
        };

        return res
          .status(200)
          .json(data);
      })
      .catch((err) => {
        logger.info(`${getClientIp(req)} ('${req.user.username}') database.getPosts error: ${err}`);
        return res
          .status(500)
          .json({ error: err.toString() });
      });
  });

  return router;
}

module.exports = init;
