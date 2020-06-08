require('dotenv').config();
const express = require('express');
const { getClientIp } = require('request-ip');
const { Validator } = require('../validator');
const { getLogger } = require('../logger');
const { ensureAuthenticated } = require('../authentication');

const logger = getLogger();
const router = express.Router();

function init(database) {
  // POST makes a forum post.
  router.post('/', ensureAuthenticated, (req, res) => {
    const userId = req.user.id;
    let { userInput } = req.body;

    if (!Validator.checkComment(userInput)) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to make post: Invalid post`);
      res.json({ error: 'Invalid post!' });
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

        return res.json(data);
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} ('${req.user.username}') database.makePost error: ${err}`);
        return res.json({ error: err });
      });
  });

  // PUT updates (edits) a forum post.
  router.put('/', ensureAuthenticated, (req, res) => {
    const { postId } = req.body;
    let { editText } = req.body;

    if (!Validator.checkComment(editText)) {
      logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to edit post #${postId}: Invalid edit`);
      return res.json({ error: 'Invalid edit!' });
    }

    editText = editText.trim();

    return database
      .findPost(postId)
      .then((post) => {
        if (post.user_id !== req.user.id) {
          logger.warn(`${getClientIp(req)} ('${req.user.username}') failed to edit post #${postId}: Post belongs to another user. Note that this is highly suspicious behavior.`);
          return res.json({ error: "You can't edit other users' posts!" });
        }

        return database
          .editPost(postId, editText)
          .then((editedPost) => {
            logger.info(`${getClientIp(req)} ('${req.user.username}') edited post #${postId}`);
            return res.json(editedPost);
          })
          .catch((err) => {
            logger.error(`${getClientIp(req)} ('${req.user.username}') database.editPost error while trying to edit post #${postId}: ${err}`);
            return res.json({ error: err });
          });
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} ('${req.user.username}') database.findPost error while trying to find post #${postId}: ${err}`);
        return res.json({ error: err });
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
          return res.json({ error: "You can't delete other users' posts!" });
        }

        return database
          .deletePost(postId)
          .then((success) => {
            logger.info(`${getClientIp(req)} ('${req.user.username}') deleted post #${postId}`);
            return res.json(success);
          })
          .catch((err) => {
            logger.error(`${getClientIp(req)} ('${req.user.username}') database.deletePost error: ${err}`);
            return res.json({ error: err });
          });
      })
      .catch((err) => {
        logger.error(`${getClientIp(req)} ('${req.user.username}') database.findPost error: ${err}`);
        return res.json({ error: err });
      });
  });

  // GET returns all forum posts.
  router.get('/', ensureAuthenticated, (req, res) => {
    database
      .getPosts()
      .then((posts) => {
        logger.info(`${getClientIp(req)} ('${req.user.username}') got all posts`);

        const data = {
          userId: req.user.id,
          posts,
        };

        return res.json(data);
      })
      .catch((err) => {
        logger.info(`${getClientIp(req)} ('${req.user.username}') database.getPosts error: ${err}`);
        return res.json({ error: err });
      });
  });

  return router;
}

module.exports = init;
