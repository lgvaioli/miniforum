const faker = require('faker');

const PASSWORD_MINLENGTH = 6;

/**
 * @description A class with static methods to check user input, and generate invalid
 * input. Disregard the 'new' keyword in this documentation, it's just a {@link https://github.com/jsdoc/jsdoc/issues/185 JSDoc bug}.
 * @class
 */
class Validator {
  /**
   * Checks for a valid username with the following rules:
   * - Only the characters [a-zA-Z], [0-9], _ (underscore), - (dash), and . (dot) are allowed.
   * - Minimum length of 1 character.
   * - Maximum length of 20 characters.
   * @param {String} username Username to check.
   * @returns {Boolean} True if the username is valid; false otherwise.
   */
  static checkUsername(username) {
    const regexp = /^[a-zA-Z0-9_\-.]{1,20}$/;
    return regexp.test(username);
  }

  /**
   * Creates a new invalid username.
   * @returns {String} A new invalid username.
   */
  static createInvalidUsername() {
    return `${faker.internet.userName()}+*$`;
  }

  /**
   * Checks for a valid email with the following rules:
   * - Only the characters [a-zA-Z], [0-9], _ (underscore), - (dash), @ (at),
   * and . (dot) are allowed.
   * - Minimum length of 10 characters.
   * - Maximum length of 255 characters.
   * - Contains at least one '@' character.
   * @param email {String} Email to check.
   * @returns {Boolean} True if the email is valid; false otherwise.
   */
  static checkEmail(email) {
    if (!email.includes('@')) {
      return false;
    }

    const regexp = /^[a-zA-Z0-9_\-@.]{10,255}$/;
    return regexp.test(email);
  }

  /**
   * Creates a new invalid email.
   * @returns {String} A new invalid email.
   */
  static createInvalidEmail() {
    return `${faker.internet.email()}+*$`;
  }

  /**
   * Checks for a valid password with the following rules:
   * - Password must be at least 6 characters long.
   * @param {String} password Password to check.
   * @returns {Boolean} True if the password is valid; false otherwise.
   */
  static checkPassword(password) {
    return password.length >= PASSWORD_MINLENGTH;
  }

  /**
   * Creates a new invalid password.
   * @returns {String} A new invalid password.
   */
  static createInvalidPassword() {
    return faker.internet.password().slice(0, PASSWORD_MINLENGTH);
  }

  /**
   * Checks for a valid comment with the following rules:
   * - Comment can't be entirely made up of whitespace.
   * - Comment must be at most 255 characters long.
   * @param {String} comment Comment to check.
   * @returns {Boolean} True if the comment is valid; false otherwise.
   */
  static checkComment(comment) {
    if (comment.length > 255) {
      return false;
    }

    const noWhitespace = comment.replace(/\s/g, '');

    return noWhitespace.length > 0;
  }

  /**
   * Creates a new invalid comment.
   * @returns {String} A new invalid comment.
   */
  static createInvalidComment() {
    return '        ';
  }
}

exports.Validator = Validator;
