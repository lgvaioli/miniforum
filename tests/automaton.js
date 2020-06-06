/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const faker = require('faker');

class Automaton {
  /**
   * Class constructor.
   * @param {Page} page A Puppeteer initialized page. This will be used for all operations.
   * @param {String} loginUrl The URL of the 'login' page.
   */
  constructor(page, loginUrl) {
    this.page = page;
    this.loginUrl = loginUrl;
  }

  /**
   * Creates a fake (i.e., valid and incorrect) user with faker.
   * @returns {Object} An object { username, email, password }.
   */
  static createFakeUser() {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    };
  }

  /**
   * Puppeteer page.goto wrapper.
   * @param {String} url A URL to go to.
   * @returns {Promise} A Puppeteer page.goto Promise.
   */
  goto(url) {
    return this.page.goto(url);
  }

  /**
   * Logins a user. Optionally waits for an element after clicking the 'Login' button.
   * @param {Object} user An object { username, password }; 'username' and 'password' can be null;
   * if both of them are null, the behavior is the same as if the user simply clicked the login
   * button without typing any login information.
   * @param {String} waitId Optional parameter. A data-testid of an element to wait for.
   * @returns {Promise} Return value depends on whether a waitId was passed in or not.
   * If no waitId was passed in, resolves to the navigated page after having (a)waited for
   * username/password typing and clicking on the login button. Note that whether the login was
   * successful or not must be checked by the user.
   * If a waitId was passed in, resolves to the navigated page after doing the above plus
   * waiting for waitId.
   */
  async login(user, waitId = null) {
    await this.page.goto(this.loginUrl);

    // If username is set, wait for loginUsername and type username
    if (user.username) {
      await this.page.waitForSelector('[data-testid="loginUsername"]');
      await this.page.type('[data-testid="loginUsername"]', user.username);
    }

    // If password is set, wait for loginPassword and type password
    if (user.password) {
      await this.page.waitForSelector('[data-testid="loginPassword"]');
      await this.page.type('[data-testid="loginPassword"]', user.password);
    }

    // Wait for login button and click it
    await this.page.waitForSelector('[data-testid="loginLoginBtn"]');
    await this.page.click('[data-testid="loginLoginBtn"]');

    if (waitId) {
      await this.page.waitForSelector(`[data-testid="${waitId}"]`);
    }

    // Everything worked, resolve to the page
    return this.page;
  }

  /**
   * Makes a post, without checking whether it was succesfully posted or not. Optionally
   * waits for an element after making the post.
   * @param {Object} user An object { username, password }.
   * @param {String} postText The post text. Can be null, in which case the behavior
   * is like just clicking the "Post message" button without entering anything in the textarea.
   * @param {String} waitId Optional parameter. A data-testid of an element to wait for.
   * @returns {Promise} Resolves to the navigated page after clicking the 'Post message' button.
   * Whether the post was successful or not must be checked by the user.
   */
  async makePost(user, postText, waitId = null) {
    const loggedInPage = await this.login(user);

    // If postText is set, type it into userInput
    if (postText) {
      await loggedInPage.waitForSelector('[data-testid="userInput"]');
      await loggedInPage.type('[data-testid="userInput"]', postText);
    }

    await loggedInPage.waitForSelector('[data-testid="postMessageBtn"]');
    await loggedInPage.click('[data-testid="postMessageBtn"]');

    if (waitId) {
      await loggedInPage.waitForSelector(`[data-testid="${waitId}"]`);
    }

    // Everything went ok, resolve to page
    return loggedInPage;
  }

  /**
   * Makes a post and checks that it was successful.
   * @param {Object} user An object { username, password }.
   * @param {String} postText The post text.
   * @returns {Promise} Resolves to an object { page, postId }, where 'page' is the navigated page
   * and 'postId' is the id of the post just made.
   */
  async makeCheckedPost(user, postText) {
    // First make a post
    const loggedInPage = await this.makePost(user, postText);

    // Check that the post was actually made and save the post id
    await loggedInPage.waitForSelector('[class="post-container"]');
    const postContainerEl = await loggedInPage.$('[class="post-container"]');
    const postContainerId = await loggedInPage.evaluate((element) => element.id, postContainerEl);
    const postId = postContainerId.match(/post_(\d+)/)[1];

    return {
      page: loggedInPage,
      postId,
    };
  }

  /**
   * Types in data in a form and then clicks the submit button. Optionally waits for
   * an element after clicking the submit button.
   * @param {Object} form An object { inputsIds, submitBtnId }, where 'inputsIds'
   * is an array of the data-testid's strings of the form's inputs, and 'submitBtnId'
   * is the data-testid of the form's submit button.
   * @param {Array} dataArray An array of the data to type into the form's inputs.
   * Note that order is significant: data[0] will be typed in the input with data-testid
   * inputsIds[0], data[1] in inputsIds[1], and so on.
   * @param {String} waitId Optional parameter. A data-testid of an element to wait for.
   * @returns {Promise} Return value depends on whether a waitId was passed in or not.
   * If no waitId was passed in, the function returns a page.click(submitBtnId) promise.
   * If a waitId was passed in, the function returns a page.waitForSelector(waitId) promise,
   * after clicking the submit button.
   */
  async submitForm(form, dataArray, waitId = null) {
    const { inputsIds } = form;
    const { submitBtnId } = form;

    for (let i = 0; i < inputsIds.length; i += 1) {
      await this.page.waitForSelector(`[data-testid="${inputsIds[i]}"]`);
      await this.page.type(`[data-testid="${inputsIds[i]}"]`, dataArray[i]);
    }

    await this.page.waitForSelector(`[data-testid="${submitBtnId}"]`);

    if (waitId) {
      await this.page.click(`[data-testid="${submitBtnId}"]`);
      return this.page.waitForSelector(`[data-testid="${waitId}"]`);
    }

    return this.page.click(`[data-testid="${submitBtnId}"]`);
  }

  /**
   * Waits for an element to show up when pressing ENTER on focusable elements.
   * @param {Array} focusableArray An array of strings with data-testid's to focus
   * and press ENTER on.
   * @param {String} waitId A string with the data-testid of the element to wait for.
   * @returns undefined
   */
  async waitOnEnter(focusableArray, waitId) {
    for (const focusable of focusableArray) {
      await this.page.focus(`[data-testid="${focusable}"]`);
      await this.page.keyboard.press('Enter');
      await this.page.waitForSelector(`[data-testid="${waitId}"]`);
    }
  }
}

exports.Automaton = Automaton;
