require('dotenv').config();

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const { Database } = require('./database');
const routersInit = require('./routes/routers');
const { setupAuthentication } = require('./authentication');
const { getEmailer } = require('./emailer');
const { getLogger } = require('./logger');
const { ROUTES } = require('../public/shared_globals');

const logger = getLogger();

/**
  * Body parser. Be careful with this! You gotta use the appropriate parser depending
  * on the kind of contentType you're sending with jQuery! I had trouble with this
  * because I initially used bodyParser.urlencoded while sending data as "application/json"
  * with jQuery.
  */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); // needed for Passport

// Static assets
app.use(express.static(process.env.PUBLIC_DIR, { index: false }));

// Pug templates
app.set('views', process.env.VIEWS_DIR);
app.set('view engine', 'pug');

const database = new Database(process.env.DATABASE_URL);
database
  .isConnected()
  .then(() => {
    logger.info(`Connected to database '${process.env.DATABASE_URL}'`);

    // Set up authentication
    setupAuthentication(app, database);

    // Set up emailer
    const emailer = process.env.SENDGRID_API_KEY ? getEmailer(process.env.SENDGRID_API_KEY) : null;

    // Set up routes
    const routers = routersInit(database, emailer);
    app.use(ROUTES.HOME, routers.home);
    app.use(ROUTES.FORUM, routers.forum);
    app.use(ROUTES.LOGIN, routers.login);
    app.use(ROUTES.LOGOUT, routers.logout);
    app.use(ROUTES.USER, routers.user);
    app.use(ROUTES.PASSWORD, routers.password);
    app.use(ROUTES.POST, routers.post);

    app.listen(process.env.PORT, (listenErr) => {
      if (listenErr) {
        return logger.error(`Could not start server: ${listenErr}`);
      }
      return logger.info(`Server listening at port ${process.env.PORT}...`);
    });
  })
  .catch((err) => {
    /**
     * Critical error: Could not connect to database. Set up a catch-all route to
     * display a message error.
     */
    logger.error(`Could not connect to database '${process.env.DATABASE_URL}': ${err}`);

    app.get('*', (req, res) => {
      res.render('error', { message: 'Critical error: Could not connect to database!' });
    });

    app.listen(process.env.PORT, (listenErr) => {
      if (listenErr) {
        return logger.error(`Could not start server: ${listenErr}`);
      }
      return logger.info(`Server listening at port ${process.env.PORT}...`);
    });
  });
