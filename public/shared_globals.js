/**
 * Globals shared among some JS files.
 * This file contains globals shared across both the front-end
 * and the back-end. The reason this file exists at all is because
 * I can't just pick up an env variable in the front-end (no such
 * Node mechanisms there; at least not without installing yet another
 * dependency). For simplicity's sake this gotta be enough for now.
 */
const SHARED_GLOBALS = {
  POST_MAXLENGTH: 255,
};

// Only export when in Node context
if (typeof module !== 'undefined' && module.exports) {
  exports.SHARED_GLOBALS = SHARED_GLOBALS;
}
