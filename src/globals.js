/* eslint-disable max-len */
/**
 * This file contains back-end only globals.
 */
require('dotenv').config();
const process = require('process');
const { getLogger } = require('./logger');

const logger = getLogger();

/**
 * If a critical variable is missing from the .env file, logs an error message
 * informing the user of the situation and terminates the process with exit code 1.
 */
function checkCriticalVar(varName) {
  if (!process.env[varName]) {
    logger.error(`Missing critical setting ${varName} in .env file; terminating process!`);
    process.exit(1);
  }
}

/**
 * Critical settings that the user *must* set in the .env file.
 */
checkCriticalVar('PORT');
checkCriticalVar('DATABASE_URL');
checkCriticalVar('DATABASE_TEST_URL');
checkCriticalVar('DATABASE_NO_SSL');
checkCriticalVar('SESSION_SECRET');

// Export critical variables.
exports.PORT = process.env.PORT;
exports.DATABASE_URL = process.env.DATABASE_URL;
exports.DATABASE_TEST_URL = process.env.DATABASE_TEST_URL;
exports.DATABASE_NO_SSL = process.env.DATABASE_NO_SSL === 'true';
exports.SESSION_SECRET = process.env.SESSION_SECRET;

/**
 * All the following settings are non-critical. The user can safely
 * ignore these in his .env file; sane defaults are provided here
 * because these variables are not likely to change between deploys.
 * All of these can be overwritten by setting the corresponding variable in the .env file.
 */
exports.PUBLIC_DIR = process.env.PUBLIC_DIR ? process.env.PUBLIC_DIR : 'public';
exports.VIEWS_DIR = process.env.VIEWS_DIR ? process.env.VIEWS_DIR : 'views';
exports.BCRYPT_SALTROUNDS = process.env.BCRYPT_SALTROUNDS ? parseInt(process.env.BCRYPT_SALTROUNDS, 10) : 12;
exports.PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS ? process.env.PUPPETEER_HEADLESS === 'true' : true;
exports.PUPPETEER_SLOWMO = process.env.PUPPETEER_SLOWMO ? parseInt(process.env.PUPPETEER_SLOWMO, 10) : 50;
exports.PUPPETEER_HEADLESS_SLOWMO = process.env.PUPPETEER_HEADLESS_SLOWMO ? parseInt(process.env.PUPPETEER_HEADLESS_SLOWMO, 10) : 10;
exports.PUPPETEER_TIMEOUT = process.env.PUPPETEER_TIMEOUT ? parseInt(process.env.PUPPETEER_TIMEOUT, 10) : 5000;
exports.JEST_TIMEOUT = process.env.JEST_TIMEOUT ? parseInt(process.env.JEST_TIMEOUT, 10) : 60000;
exports.EMAILER_NAME = process.env.EMAILER_NAME;
exports.EMAILER_VALIDATED_EMAIL = process.env.EMAILER_VALIDATED_EMAIL;
exports.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
