const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const { Database } = require('./database');
const routersInit = require('./routes/routers');
const { setupAuthentication } = require('./authentication');
const { getEmailer } = require('./emailer');
const { getLogger } = require('./logger');
const { ROUTES } = require('../public/js/shared_globals');
const {
  PUBLIC_DIR,
  DATABASE_URL,
  SENDGRID_API_KEY,
  PORT,
  VIEWS_DIR,
} = require('./globals');

const app = express();

// Setup Helmet
app.use(helmet());

const logger = getLogger();

/**
  * Body parser. Be careful with this! You gotta use the appropriate parser depending
  * on the kind of contentType you're sending with jQuery! I had trouble with this
  * because I initially used bodyParser.urlencoded while sending data as "application/json"
  * with jQuery.
  */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); // needed for Passport

/**
 * Selectively serve static assets from these folders. I do this instead of directly
 * exposing the PUBLIC_DIR because I do *not* want the user to have direct access
 * to the html files, e.g., I don't want the user to be able to GET /html/change_password.html
 * if he isn't logged in. This approach not only buy us more security, in the sense that we have
 * to explicitly send html files because they are not public by default, but it also enforces
 * clean URLs. We don't expose *files*, we expose *services*.
 */
app.use(express.static(`${PUBLIC_DIR}/css/`));
app.use(express.static(`${PUBLIC_DIR}/js/`));
app.use(express.static(`${PUBLIC_DIR}/res/`));

// Pug templates
app.set('views', VIEWS_DIR);
app.set('view engine', 'pug');

const database = new Database(DATABASE_URL);

// Set up authentication
setupAuthentication(app, database);

// Set up emailer
const emailer = SENDGRID_API_KEY ? getEmailer(SENDGRID_API_KEY) : null;

// Set up routes
const routers = routersInit(database, emailer);
app.use(ROUTES.HOME, routers.home);
app.use(ROUTES.FORUM, routers.forum);
app.use(ROUTES.LOGIN, routers.login);
app.use(ROUTES.LOGOUT, routers.logout);
app.use(ROUTES.USER, routers.user);
app.use(ROUTES.PASSWORD, routers.password);
app.use(ROUTES.POST, routers.post);

// 404 route
app.use((_, res) => {
  res.render('error', { message: 'Page not found!' });
});

app.listen(PORT, (listenErr) => {
  if (listenErr) {
    return logger.error(`Could not start server: ${listenErr}`);
  }
  return logger.info(`Server listening at port ${PORT}...`);
});
