/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/**
 * FIXME: This module should be refactored into a class with a nicer interface.
 * There is a LOT of duplicate code in miniforum.test.js; the worst offenders are
 * probably generic form testing (i.e. 'test that a failure toast shows up when I
 * submit this without entering info' and so on).
 */

/**
 * Logins a user with Puppeteer. Returns a Promise which resolves to a new Puppeteer
 * Page after having (a)waited for username/password typing and clicking on the
 * login button. Whether the login was redirected to the forum or to an error page
 * must be checked by the user.
 * The parameters 'username' and 'password' can be null; if both of them are null,
 * the behavior is the same as if the user simply clicked the login button without
 * typing any login information.
 */
async function automatonLogin(page, loginUrl, user) {
  await page.goto(loginUrl);

  // If username is set, wait for loginUsername and type username
  if (user.username) {
    await page.waitForSelector('[data-testid="loginUsername"]');
    await page.type('[data-testid="loginUsername"]', user.username);
  }

  // If password is set, wait for loginPassword and type password
  if (user.password) {
    await page.waitForSelector('[data-testid="loginPassword"]');
    await page.type('[data-testid="loginPassword"]', user.password);
  }

  // Wait for login button and click it
  await page.waitForSelector('[data-testid="loginLoginBtn"]');
  await page.click('[data-testid="loginLoginBtn"]');

  // Everything worked, resolve to the page
  return page;
}

/**
 * Makes a post. Does not actually check that the post was made.
 * postText can be null, in which case the behavior is like just clicking the "Post message"
 * button without entering anything in the textarea.
 */
async function automatonMakePost(page, loginUrl, user, postText) {
  const loggedInPage = await automatonLogin(page, loginUrl, user);

  // If postText is set, type it into userInput
  if (postText) {
    await loggedInPage.waitForSelector('[data-testid="userInput"]');
    await loggedInPage.type('[data-testid="userInput"]', postText);
  }

  await loggedInPage.waitForSelector('[data-testid="postMessageBtn"]');
  await loggedInPage.click('[data-testid="postMessageBtn"]');

  // Everything went ok, resolve to page
  return loggedInPage;
}

async function automatonMakePostReturnPostId(page, loginUrl, user, postText) {
  // First make a post
  const loggedInPage = await automatonMakePost(page, loginUrl, user, postText);

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
 * Checks that a form submits when pressing ENTER.
 * @param {Page} page An initialized Puppeteer Page.
 * @param {Array} focusableArray An array of strings with data-testid's to focus and press ENTER on.
 * These should be your inputs and submit button data-testid's.
 * @param {String} failureId A string with the data-testid of the element which represents failure
 * to submit a form.
 */
async function automatonCheckSubmitFormOnEnter(page, focusableArray, failureId) {
  for (const focusable of focusableArray) {
    await page.focus(`[data-testid="${focusable}"]`);
    await page.keyboard.press('Enter');
    await page.waitForSelector(`[data-testid="${failureId}"]`);
  }
}

exports.automaton = {
  login: automatonLogin,
  makePost: automatonMakePost,
  makePostReturnPostId: automatonMakePostReturnPostId,
  checkSubmitFormOnEnter: automatonCheckSubmitFormOnEnter,
};
