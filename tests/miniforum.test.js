require('dotenv').config();

const puppeteer = require('puppeteer');
const faker = require('faker');
const { automaton } = require('./automaton');
const { Database } = require('../src/database');
const { POST_MAXLENGTH } = require('../public/shared_globals').SHARED_GLOBALS;

jest.setTimeout(parseInt(process.env.JEST_TIMEOUT, 10));

let browser;
let page;
const database = new Database(process.env.DATABASE_URL);
const BASE_URL = process.env.TEST_BASEURL_NOPORT + process.env.PORT;

const routes = {
  loginUrl: BASE_URL,
};

const validUser = {
  username: process.env.TEST_USERNAME,
  password: process.env.TEST_PASSWORD,
};

const anotherValidUser = {
  username: process.env.TEST_USERNAME_2,
  password: process.env.TEST_PASSWORD_2,
};

describe('Login form tests', () => {
  beforeAll(async () => {
    // First suite launches browser and creates page.
    // Note that I set a slowMo of 3 ms when running in headless mode, because
    // otherwise Puppeteer seems to be too fast for its own good and the tests
    // randomly fail. This is true even when running in debug mode (i.e. with
    // headless: false): if you don't set a slowMo of at least 3 ms, tests
    // start randomly failing. A good 50 ms allows you to actually see what is
    // going on when running in debug mode. The 3 ms value seems to work fine
    // for my machine (Pentium G4560), but my guess is that faster machines
    // will need a higher slowMo.
    // At the end of the day, the sad truth is that Puppeteer is just flaky.
    // Abandon all hope, ye who enter here.
    let runHeadless = true;

    if (process.env.PUPPETEER_BROWSER && process.env.PUPPETEER_BROWSER === 'true') {
      runHeadless = false;
    }

    const debugConfig = {
      headless: false,
      slowMo: parseInt(process.env.PUPPETEER_SLOWMO, 10),
    };

    const headlessConfig = {
      headless: true,
      slowMo: parseInt(process.env.PUPPETEER_HEADLESS_SLOWMO, 10),
    };

    browser = await puppeteer.launch(runHeadless ? headlessConfig : debugConfig);

    page = await browser.newPage();

    // Set Puppeteer's default timeout to 5 seconds; the default 30 seconds is
    // just obscene (at least for localhost).
    await page.setDefaultTimeout(5000);
  });

  test('logins with no username and no password', async () => {
    page = await automaton.login(page, routes.loginUrl, { username: null, password: null });

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('logins with invalid username and no password', async () => {
    page = await automaton.login(page, routes.loginUrl, {
      username: faker.internet.userName(),
      password: null,
    });

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('logins with invalid username and invalid password', async () => {
    page = await automaton.login(page, routes.loginUrl, {
      username: faker.internet.userName(),
      password: faker.internet.password(),
    });

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('logins with valid username and no password', async () => {
    page = await automaton.login(page, routes.loginUrl, {
      username: validUser.username,
      password: null,
    });

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('logins with valid username and invalid password', async () => {
    page = await automaton.login(page, routes.loginUrl, {
      username: validUser.username,
      password: faker.internet.password(),
    });

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('logins with valid username and valid password', async () => {
    page = await automaton.login(page, routes.loginUrl, validUser);

    // Wait for logout button. We'll take that as a sign that we're effectively logged in
    await page.waitForSelector('[data-testid="logoutBtn"]');
  });

  test('logins with valid username and valid password, then logouts', async () => {
    page = await automaton.login(page, routes.loginUrl, validUser);

    // Wait for logout button and click
    await page.waitForSelector('[data-testid="logoutBtn"]');
    await page.click('[data-testid="logoutBtn"]');

    // Wait for loginUsername. We'll take that as a sign that we're effectively logged out
    await page.waitForSelector('[data-testid="loginUsername"]');
  });
});

describe('New account form tests', () => {
  test('creates new account with no input', async () => {
    // Go to login page
    await page.goto(routes.loginUrl);

    // Click "Create account" button
    await page.waitForSelector('[data-testid="createAccountBtn"]');
    await page.click('[data-testid="createAccountBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('creates new account with existing username and wrong email/password', async () => {
    // Go to login page
    await page.goto(routes.loginUrl);

    // Type in existing username
    await page.waitForSelector('[data-testid="accountUsername"]');
    await page.type('[data-testid="accountUsername"]', validUser.username);

    // Type in wrong (but valid) email
    await page.waitForSelector('[data-testid="accountEmail"]');
    await page.type('[data-testid="accountEmail"]', faker.internet.email());

    // Type in wrong (but valid) password
    await page.waitForSelector('[data-testid="accountPassword"]');
    await page.type('[data-testid="accountPassword"]', faker.internet.password());

    // Click "Create account" button
    await page.waitForSelector('[data-testid="createAccountBtn"]');
    await page.click('[data-testid="createAccountBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('creates new account', async () => {
    // Go to login page
    await page.goto(routes.loginUrl);

    // Type in username
    await page.waitForSelector('[data-testid="accountUsername"]');
    await page.type('[data-testid="accountUsername"]', faker.internet.userName());

    // Type in email
    await page.waitForSelector('[data-testid="accountEmail"]');
    await page.type('[data-testid="accountEmail"]', faker.internet.email());

    // Type in password
    await page.waitForSelector('[data-testid="accountPassword"]');
    await page.type('[data-testid="accountPassword"]', faker.internet.password());

    // Click "Create account" button
    await page.waitForSelector('[data-testid="createAccountBtn"]');
    await page.click('[data-testid="createAccountBtn"]');

    // Wait for logout button; we'll take that as a sign that we successfully created
    // the account
    await page.waitForSelector('[data-testid="logoutBtn"]');
  });
});

describe('Reset password form tests', () => {
  test('resets password with no input', async () => {
    // Go to login page
    await page.goto(routes.loginUrl);

    // Click 'Reset password' button
    await page.waitForSelector('[data-testid="resetPasswordBtn"]');
    await page.click('[data-testid="resetPasswordBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('resets password with invalid user', async () => {
    // Go to login page
    await page.goto(routes.loginUrl);

    // Type invalid user
    await page.waitForSelector('[data-testid="resetPasswordUsername"]');
    await page.type('[data-testid="resetPasswordUsername"]', faker.internet.userName());

    // Type invalid email
    await page.waitForSelector('[data-testid="resetPasswordEmail"]');
    await page.type('[data-testid="resetPasswordEmail"]', faker.internet.email());

    // Click 'Reset password' button
    await page.waitForSelector('[data-testid="resetPasswordBtn"]');
    await page.click('[data-testid="resetPasswordBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('resets password with valid user and invalid email', async () => {
    // Go to login page
    await page.goto(routes.loginUrl);

    // Type valid user
    await page.waitForSelector('[data-testid="resetPasswordUsername"]');
    await page.type('[data-testid="resetPasswordUsername"]', validUser.username);

    // Type invalid email
    await page.waitForSelector('[data-testid="resetPasswordEmail"]');
    await page.type('[data-testid="resetPasswordEmail"]', faker.internet.email());

    // Click 'Reset password' button
    await page.waitForSelector('[data-testid="resetPasswordBtn"]');
    await page.click('[data-testid="resetPasswordBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });
});

describe('Change password form tests', () => {
  test('changes password with no input', async () => {
    page = await automaton.login(page, routes.loginUrl, validUser);

    // Click 'Change password' button
    await page.waitForSelector('[data-testid="changePasswordBtn"]');
    await page.click('[data-testid="changePasswordBtn"]');

    // Click 'Change password' (inner) button
    await page.waitForSelector('[data-testid="changePasswordInnerBtn"]');
    await page.click('[data-testid="changePasswordInnerBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('changes password with wrong current password', async () => {
    page = await automaton.login(page, routes.loginUrl, {
      username: validUser.username,
      password: validUser.password,
    });

    // Click 'Change password' button
    await page.waitForSelector('[data-testid="changePasswordBtn"]');
    await page.click('[data-testid="changePasswordBtn"]');

    // Type invalid current password
    await page.waitForSelector('[data-testid="currentPassword"]');
    await page.type('[data-testid="currentPassword"]', faker.internet.password());

    // Type random newPassword
    const newPassword = faker.internet.password();
    await page.waitForSelector('[data-testid="newPassword"]');
    await page.type('[data-testid="newPassword"]', newPassword);

    // Type random newPasswordAgain (same as newPassword)
    await page.waitForSelector('[data-testid="newPasswordAgain"]');
    await page.type('[data-testid="newPasswordAgain"]', newPassword);

    // Click 'Change password' (inner) button
    await page.waitForSelector('[data-testid="changePasswordInnerBtn"]');
    await page.click('[data-testid="changePasswordInnerBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });

  test('changes password with new password mismatch', async () => {
    page = await automaton.login(page, routes.loginUrl, validUser);

    // Click 'Change password' button
    await page.waitForSelector('[data-testid="changePasswordBtn"]');
    await page.click('[data-testid="changePasswordBtn"]');

    // Type invalid current password
    await page.waitForSelector('[data-testid="currentPassword"]');
    await page.type('[data-testid="currentPassword"]', faker.internet.password());

    // Type random newPassword
    await page.waitForSelector('[data-testid="newPassword"]');
    await page.type('[data-testid="newPassword"]', faker.internet.password());

    // Type random newPasswordAgain
    await page.waitForSelector('[data-testid="newPasswordAgain"]');
    await page.type('[data-testid="newPasswordAgain"]', faker.internet.password());

    // Click 'Change password' (inner) button
    await page.waitForSelector('[data-testid="changePasswordInnerBtn"]');
    await page.click('[data-testid="changePasswordInnerBtn"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="errorMsg"]');
  });
});

describe('Character counting test', () => {
  test('chars left with no input', async () => {
    page = await automaton.login(page, routes.loginUrl, validUser);

    // Get input counter num
    const inputCounterEl = await page.$('[data-testid="inputCounterTest"]');
    const inputCounterNum = Number(await page.evaluate((el) => el.textContent, inputCounterEl));

    // Verify correct charsLeft
    expect(inputCounterNum).toBe(POST_MAXLENGTH);
  });

  test('chars left with some input', async () => {
    page = await automaton.login(page, routes.loginUrl, validUser);

    // Type some text
    const exampleText = 'This is some example text';
    await page.waitForSelector('[data-testid="userInput"]');
    await page.type('[data-testid="userInput"]', exampleText);

    // Get input counter num
    const inputCounterEl = await page.$('[data-testid="inputCounterTest"]');
    const inputCounterNum = Number(await page.evaluate((el) => el.textContent, inputCounterEl));

    // Calculate correct charsLeft
    const charsLeft = POST_MAXLENGTH - exampleText.length;

    // Verify correct charsLeft
    expect(inputCounterNum).toBe(charsLeft);
  });
});

describe('Posting tests', () => {
  // For simplicity's sake, clear database of all posts before each test
  beforeEach(async () => {
    await database.clearPosts();
  });

  test('makes a post with valid input', async () => {
    page = await automaton.makePost(page, routes.loginUrl, validUser, 'Posted with Puppeteer!');

    // Check that the post was actually made. Do note that this works only if there were no
    // previous posts.
    await page.waitForSelector('[data-testid="postContainer_test"]');
  });

  test('makes a post with no input', async () => {
    page = await automaton.makePost(page, routes.loginUrl, validUser, null);

    // Wait for failure toast
    await page.waitForSelector('[data-testid="toast-failure"]');
  });

  test('makes a post with invalid input (only whitespace)', async () => {
    page = await automaton.makePost(page, routes.loginUrl, validUser, '       ');

    // Wait for failure toast
    await page.waitForSelector('[data-testid="toast-failure"]');
  });

  test('deletes a post', async () => {
    page = await automaton.makePost(page, routes.loginUrl, validUser,
      "Posted with Puppeteer; we're gonna delete this one!");

    // Wait for and click the first delete button on the page
    await page.waitForSelector('[data-testid="deleteBtn_test"]');
    await page.click('[data-testid="deleteBtn_test"]');

    // Wait for success toast
    await page.waitForSelector('[data-testid="toast-success"]');
  });

  test('edits a post', async () => {
    page = await automaton.makePost(page, routes.loginUrl, validUser,
      "Posted with Puppeteer; we're gonna edit this one!");

    // Wait for and click the edit button
    await page.waitForSelector('[data-testid="editBtn_test"]');
    await page.click('[data-testid="editBtn_test"]');

    // Type some text in the editable textarea
    await page.waitForSelector('[data-testid="editable_textarea_test"]');
    await page.type('[data-testid="editable_textarea_test"]', ' EDITED!');

    // Click the "Post edit" button
    await page.waitForSelector('[data-testid="postEditBtn"');
    await page.click('[data-testid="postEditBtn"');

    // Wait for success toast
    await page.waitForSelector('[data-testid="toast-success"]');

    // Check that the edit actually worked
    const postTextElement = await page.$('[data-testid="postText_test"');
    const text = await page.evaluate((element) => element.textContent,
      postTextElement);

    expect(text).toMatch(/.* EDITED!$/);
  });
});

describe('API tests', () => {
  // For simplicity's sake, clear database of all posts before each test
  beforeEach(async () => {
    await database.clearPosts();
  });

  /**
   * Last suite must close the Puppeteer browser and database connection!
   * Note that the database singleton is absolutely evil and we should probably
   * get rid of it as soon as possible. A database singleton sounds like a good
   * idea until you actually try to implement testing...
   * Long story short: until we get rid of the wicked database singleton, we must
   * database.close ONLY in the last suite which uses the database.
   */
  afterAll(async () => {
    await browser.close();
    await database.close();
  });

  test('deletes post from another user', async () => {
    // Make post as validUser
    const data = await automaton.makePostReturnPostId(page, routes.loginUrl, validUser,
      'Posted with Puppeteer!');

    let loggedInPage = data.page;

    // Log out from validUser
    await loggedInPage.waitForSelector('[data-testid="logoutBtn"]');
    await loggedInPage.click('[data-testid="logoutBtn"]');
    await loggedInPage.waitForSelector('[data-testid="loginUsername"]');

    // Log in as anotherValidUser
    loggedInPage = await automaton.login(loggedInPage, routes.loginUrl, anotherValidUser);
    await loggedInPage.waitForSelector('[data-testid="logoutBtn"]');

    // Try to delete validUser's post
    const fetchResult = await loggedInPage.evaluate((postId, deletePostRoute) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

      const urlencoded = new URLSearchParams();
      urlencoded.append('postId', postId);

      const requestOptions = {
        method: 'DELETE',
        headers: myHeaders,
        body: urlencoded,
        redirect: 'follow',
      };

      return fetch(deletePostRoute, requestOptions)
        .then((response) => response.text())
        .then((result) => result)
        .catch((err) => err);
    }, data.postId, '/api/deletePost');

    // FIXME: Brittle test; this string might change in the future!
    expect(fetchResult).toMatch(/.*You can't delete other users' posts.*/);
  });

  test('edits post from another user', async () => {
    // Make post as validUser
    const data = await automaton.makePostReturnPostId(page, routes.loginUrl, validUser,
      'Posted with Puppeteer!');

    let loggedInPage = data.page;

    // Log out from validUser
    await loggedInPage.waitForSelector('[data-testid="logoutBtn"]');
    await loggedInPage.click('[data-testid="logoutBtn"]');
    await loggedInPage.waitForSelector('[data-testid="loginUsername"]');

    // Log in as anotherValidUser
    loggedInPage = await automaton.login(loggedInPage, routes.loginUrl, anotherValidUser);
    await loggedInPage.waitForSelector('[data-testid="logoutBtn"]');

    // Try to edit validUser's post
    const fetchResult = await loggedInPage.evaluate((postId, editPostRoute) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

      const urlencoded = new URLSearchParams();
      urlencoded.append('postId', postId);
      urlencoded.append('editText', 'Edited a post from another user!');

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
        redirect: 'follow',
      };

      return fetch(editPostRoute, requestOptions)
        .then((response) => response.text())
        .then((result) => result)
        .catch((err) => err);
    }, data.postId, '/api/editPost');

    // FIXME: Brittle test; this string might change in the future!
    expect(fetchResult).toMatch(/.*You can't edit other users' posts*/);
  });
});
