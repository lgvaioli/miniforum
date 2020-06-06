/* eslint-disable no-unused-vars */
/**
 * Globals shared among some JS files.
 * This file contains globals shared across both the front-end
 * and the back-end. The reason this file exists at all is because
 * I can't just pick up an env variable in the front-end (no such
 * Node mechanisms there; at least not without installing yet another
 * dependency). For simplicity's sake this gotta be enough for now.
 */
const POST_MAXLENGTH = 255;

const ROUTES = {
  HOME: '/',
  FORUM: '/forum',
  LOGIN: '/login',
  LOGOUT: '/logout',
  USER: '/user',
  PASSWORD: '/password',
  POST: '/post',
};

let BROWSER_ROUTES;

const REDIRECTS = {
  LOGIN: {
    SUCCESS: ROUTES.FORUM,
    FAILURE: ROUTES.HOME,
  },
  USER_CREATE: {
    SUCCESS: ROUTES.FORUM,
    FAILURE: ROUTES.HOME,
  },
  LOGOUT: {
    SUCCESS: ROUTES.HOME,
    FAILURE: ROUTES.HOME,
  },
  PASSWORD_CHANGE: {
    SUCCESS: ROUTES.HOME,
  },
};

// Only define BROWSER_ROUTES if in browser context
if (typeof window !== 'undefined') {
  const BASE_URL = `${window.location.protocol}//${window.location.host}`;

  BROWSER_ROUTES = {
    HOME: `${BASE_URL}${ROUTES.HOME}`,
    FORUM: `${BASE_URL}${ROUTES.FORUM}`,
    LOGIN: `${BASE_URL}${ROUTES.LOGIN}`,
    LOGOUT: `${BASE_URL}${ROUTES.LOGOUT}`,
    USER: `${BASE_URL}${ROUTES.USER}`,
    PASSWORD: `${BASE_URL}${ROUTES.PASSWORD}`,
    POST: `${BASE_URL}${ROUTES.POST}`,
  };
}

// Only export when in Node context
if (typeof module !== 'undefined' && module.exports) {
  exports.POST_MAXLENGTH = POST_MAXLENGTH;
  exports.ROUTES = ROUTES;
  exports.REDIRECTS = REDIRECTS;
}
