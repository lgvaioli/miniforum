require('dotenv').config();

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const { getDatabase } = require('./database');
const { setupRoutes } = require('./routes');
const { setupAuthentication } = require('./authentication');
const { getEmailer } = require('./emailer');
const { getLogger } = require('./logger');

const logger = getLogger();

getDatabase()
  .then((db) => {
    // Body parser. Be careful with this! You gotta use the appropriate parser depending
    // on the kind of contentType you're sending with jQuery! I had trouble with this
    // because I initially used bodyParser.urlencoded while sending data as "application/json"
    // with jQuery.
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false })); // needed for Passport

    // Static assets
    app.use(express.static(process.env.PUBLIC_DIR, { index: false }));

    // Pug templates
    app.set('views', process.env.VIEWS_DIR);
    app.set('view engine', 'pug');

    // Set up stuff
    setupAuthentication(app, db);
    const emailer = process.env.SENDGRID_API_KEY ? getEmailer(process.env.SENDGRID_API_KEY) : null;
    setupRoutes(app, db, emailer);

    app.listen(process.env.PORT, (listenErr) => {
      if (listenErr) {
        return logger.error(`Could not start server: ${listenErr}`);
      }

      return logger.info(`Server listening at port ${process.env.PORT}...`);
    });
  })
  .catch((err) => {
    // This is a critical failure which renders the entire site useless.
    // Setup a route to catch all GET requests and render an error template.
    logger.error(`Could not connect to database: ${err}`);

    app.use(express.static(process.env.PUBLIC_DIR, { index: false }));
    app.set('views', process.env.VIEWS_DIR);
    app.set('view engine', 'pug');

    app.route('*')
      .get((req, res) => res.render('error', { message: 'Critical failure: Could not connect to database' }));

    app.listen(process.env.PORT, (listenErr) => {
      if (listenErr) {
        return logger.error(`Could not start server: ${listenErr}`);
      }

      return logger.info(`Server listening at port ${process.env.PORT}...`);
    });
  });
