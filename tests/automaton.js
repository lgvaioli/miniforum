// FIXME: Implement this as a ES6 class
const automaton = {
  // eslint-disable-next-line no-use-before-define
  login: automatonLogin,
  // eslint-disable-next-line no-use-before-define
  makePost: automatonMakePost,
};

// Logins a user with Puppeteer. Returns a Promise which resolves to a new Puppeteer
// Page after having (a)waited for username/password typing and clicking on the
// login button. Whether the login was redirected to the forum or to an error page
// must be checked by the user.
// The parameters 'username' and 'password' can be null; if both of them are null,
// the behavior is the same as if the user simply clicked the login button without
// typing any login information.
async function automatonLogin(page, loginUrl, username, password) {
  await page.goto(loginUrl);

  // If username is set, wait for loginUsername and type username
  if (username) {
    await page.waitForSelector('[data-testid="loginUsername"]');
    await page.type('[data-testid="loginUsername"]', username);
  }

  // If password is set, wait for loginPassword and type password
  if (password) {
    await page.waitForSelector('[data-testid="loginPassword"]');
    await page.type('[data-testid="loginPassword"]', password);
  }

  // Wait for login button and click it
  await page.waitForSelector('[data-testid="loginLoginBtn"]');
  await page.click('[data-testid="loginLoginBtn"]');

  // Everything worked, resolve to the page
  return page;
}

// Makes a post. Does not actually check that the post was made.
// postText can be null, in which case the behavior is like just clicking the "Post message"
// button without entering anything in the textarea.
async function automatonMakePost(page, loginUrl, username, password, postText) {
  const loggedInPage = await automatonLogin(page, loginUrl, username, password);

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

exports.automaton = automaton;
