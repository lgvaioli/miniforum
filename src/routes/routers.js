const homeRouter = require('./home');
const forumRouter = require('./forum');
const loginRouter = require('./login');
const logoutRouter = require('./logout');
const userInit = require('./user');
const passwordInit = require('./password');
const postInit = require('./post');

function init(database, emailer) {
  // Initialize routers
  const userRouter = userInit(database);
  const passwordRouter = passwordInit(database, emailer);
  const postRouter = postInit(database);

  return {
    home: homeRouter,
    forum: forumRouter,
    login: loginRouter,
    logout: logoutRouter,
    user: userRouter,
    password: passwordRouter,
    post: postRouter,
  };
}

module.exports = init;
