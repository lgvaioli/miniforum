require('dotenv').config();

const puppeteer = require('puppeteer');
const faker = require('faker');
const { Automaton } = require('./automaton');
const { Database } = require('../src/database');
const { POST_MAXLENGTH } = require('../public/js/shared_globals');
const { ROUTES } = require('../public/js/shared_globals');

jest.setTimeout(parseInt(process.env.JEST_TIMEOUT, 10));

let browser;
let automaton;
const database = new Database(process.env.DATABASE_TEST_URL);
const LOGIN_FULLURL = `http://localhost:${process.env.PORT}`;

const validUser = {
  username: 'Test_Username',
  email: 'Test_Username@Test_Username.com',
  password: 'Test_Password',
};

const anotherValidUser = {
  username: 'Test_Username_2',
  email: 'Test_Username_2@Test_Username_2.com',
  password: 'Test_Password_2',
};

/**
  * Note on the terms I use throughout all tests:
  * - 'valid input' is input which satisfies validation rules as implemented in
  * validation.js.
  * - 'invalid input' is input which does NOT satisfy validation rules.
  * - 'correct input' is valid input which makes the operation in question (e.g. logging
  * in) complete successfully. For example, a username which corresponds to a user in the
  * database is correct input.
  * - 'incorrect input' is valid input which makes the operation in question fail. For example,
  * a username which satisfies validation rules but doesn't actually correspond to an existing
  * user in the database.
  * - 'empty input' means no input, as in sending a form without filling out the information first.
  *
  * I only check the <form>s with a couple of inputs combinations, mostly: a) make sure that
  * correct inputs work, b) that incorrect inputs don't work, and c) that partially correct
  * inputs, e.g., correct username and incorrect password, don't work.
  * Testing all possible inputs combinations is a combinatorial explosion not worth the trouble.
  */
describe('Login form tests', () => {
  beforeAll(async () => {
    /**
     * Clears (i.e. deletes users and posts) the whole database. If this and the following
     * user creation fails we're screwed anyway, so that's why we don't bother to catch
     * errors.
     */
    await database.clearAll();

    // Create a couple of valid users
    await database.createUser(validUser);
    await database.createUser(anotherValidUser);

    /**
     * First suite launches browser and creates page.
     * Note that I set a slowMo of PUPPETEER_SLOWMO ms when running in headless mode, because
     * otherwise Puppeteer seems to be too fast for its own good and the tests
     * randomly fail. This is true even when running in debug mode (i.e. with
     * headless: false): if you don't set a slowMo of at least 3 ms, tests
     * start randomly failing. A good 50 ms allows you to actually see what is
     * going on when running in debug mode. The 3 ms value seems to work fine
     * for my machine (Pentium G4560), but my guess is that faster machines
     * will need a higher slowMo.
     * At the end of the day, the sad truth is that Puppeteer is just flaky.
     * Abandon all hope, ye who enter here.
     */
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

    const page = await browser.newPage();

    /**
     * Set Puppeteer's default timeout to 5 seconds; the default 30 seconds is
     * just obscene (at least for localhost).
     */
    await page.setDefaultTimeout(process.env.PUPPETEER_TIMEOUT);

    automaton = new Automaton(page, LOGIN_FULLURL);
  });

  /**
   * Regression test: When I stopped using <form>s because of their inability to handle
   * anything but POST/GET, I inadvertently broke a nice behavior (which I personally use
   * a LOT): Submit the form when pressing ENTER. This test checks that submission on
   * ENTER works.
   */
  test('submits form on ENTER', async () => {
    const focusablesIds = ['loginUsername'];
    const waitId = 'toast-failure';
    await automaton.goto(LOGIN_FULLURL);
    await automaton.waitOnEnter(focusablesIds, waitId);
  });

  test('logs in - incorrect inputs', async () => {
    await automaton.login(Automaton.createFakeUser(), 'toast-failure');
  });

  test('logs in - partially correct inputs', async () => {
    // Partially correct user: Correct username and incorrect password
    const partialUser = {
      username: validUser.username,
      password: faker.internet.password(),
    };
    await automaton.login(partialUser, 'toast-failure');
  });

  test('logs in - correct inputs; then logouts', async () => {
    // Login and wait for #logoutBtn
    const page = await automaton.login(validUser, 'logoutBtn');

    // Click logout button
    await page.click('[data-testid="logoutBtn"]');

    // Wait for loginUsername. We'll take that as a sign that we're effectively logged out
    await page.waitForSelector('[data-testid="loginUsername"]');
  });
});

describe('New account form tests', () => {
  const createAccountForm = {
    inputsIds: [
      'accountUsername',
      'accountEmail',
      'accountPassword',
    ],
    submitBtnId: 'createAccountBtn',
  };

  test('submits form on ENTER', async () => {
    // Just check the first input; no point in wasting time being exhaustive
    const focusablesIds = createAccountForm.inputsIds[0];
    const failureId = 'toast-failure';
    await automaton.goto(LOGIN_FULLURL);
    await automaton.waitOnEnter([focusablesIds], failureId);
  });

  test('creates new account - invalid inputs', async () => {
    await automaton.goto(LOGIN_FULLURL);

    /**
     * FIXME: This implicitly hard-codes our validation rules. The validation module
     * should have functions to generate random invalid inputs, e.g., createInvalidUsername.
     */
    const userData = [
      '+-+*/.,.,.', // invalid username
      'invalidemail', // invalid email
      '123', // invalid password
    ];

    // Submit form and wait for #toast-failure
    await automaton.submitForm(createAccountForm, userData, 'toast-failure');
  });

  test('creates new account - partially correct inputs', async () => {
    // Go to login page
    await automaton.goto(LOGIN_FULLURL);

    /**
     * Partially correct user: Incorrect username (username is already taken) and
     * correct email/password.
     */
    const userData = [
      validUser.username,
      faker.internet.email(),
      faker.internet.password(),
    ];

    // Submit form and wait for #toast-failure
    await automaton.submitForm(createAccountForm, userData, 'toast-failure');
  });

  test('creates new account - correct inputs', async () => {
    // Go to login page
    await automaton.goto(LOGIN_FULLURL);

    // Create "fake" user with correct username/email/password
    const user = Automaton.createFakeUser();
    const data = [
      user.username,
      user.email,
      user.password,
    ];

    // Submit form and wait for #logoutBtn
    await automaton.submitForm(createAccountForm, data, 'logoutBtn');
  });
});

describe('Reset password form tests', () => {
  const resetPasswordForm = {
    inputsIds: [
      'resetPasswordUsername',
      'resetPasswordEmail',
      'resetPasswordBtn',
    ],
    submitBtnId: 'resetPasswordBtn',
  };

  test('submits form on ENTER', async () => {
    // Just check the first input; no point in wasting time being exhaustive
    const focusablesIds = resetPasswordForm.inputsIds[0];
    const failureId = 'toast-failure';
    await automaton.goto(LOGIN_FULLURL);
    await automaton.waitOnEnter([focusablesIds], failureId);
  });

  test('resets password - incorrect inputs', async () => {
    // Go to login page
    await automaton.goto(LOGIN_FULLURL);

    // Creates incorrect user (i.e. valid data that doesn't correspond to an actual user)
    const user = Automaton.createFakeUser();
    const userData = [
      user.username,
      user.email,
      user.password,
    ];

    await automaton.submitForm(resetPasswordForm, userData, 'toast-failure');
  });
});

describe('Change password form tests', () => {
  const changePasswordForm = {
    inputsIds: [
      'currentPassword',
      'newPassword',
      'newPasswordAgain',
    ],
    submitBtnId: 'changePasswordInnerBtn',
  };

  test('changes password - incorrect inputs', async () => {
    const page = await automaton.login(validUser, 'changePasswordBtn');

    /**
     * Click 'Change password' button to go to the 'Change password' page, which
     * is the one that actually contains the 'Change password' form.
     */
    await page.click('[data-testid="changePasswordBtn"]');

    const data = [
      faker.internet.password(), // incorrect current password
      faker.internet.password(), // valid new password
      faker.internet.password(), // valid but unmatching new password
    ];

    // Submit data and wait for #toast-failure
    await automaton.submitForm(changePasswordForm, data, 'toast-failure');
  });
});

describe('Character counting test', () => {
  test('chars left - correct input', async () => {
    const page = await automaton.login(validUser);

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

  test('makes a post - incorrect input', async () => {
    await automaton.makePost(validUser, '       ', 'toast-failure');
  });

  test('makes a post - correct input', async () => {
    // Cheaper than makeCheckedPost
    await automaton.makePost(validUser, 'Posted with Puppeteer!', 'postContainer_test');
  });

  test('deletes a post', async () => {
    const page = await automaton.makePost(validUser,
      "Posted with Puppeteer; we're gonna delete this one!", 'deleteBtn_test');

    // Click the first delete button on the page
    await page.click('[data-testid="deleteBtn_test"]');

    // Wait for success toast
    await page.waitForSelector('[data-testid="toast-success"]');
  });

  test('edits a post', async () => {
    const page = await automaton.makePost(validUser,
      "Posted with Puppeteer; we're gonna edit this one!", 'editBtn_test');

    // Click the edit button
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

  // Last suite closes and cleans up stuff
  afterAll(async () => {
    await browser.close();
    await database.clearAll();
    await database.close();
  });

  test('deletes post from another user', async () => {
    // Make post as validUser
    const data = await automaton.makeCheckedPost(validUser,
      'Posted with Puppeteer!');

    let loggedInPage = data.page;

    // Log out from validUser
    await loggedInPage.waitForSelector('[data-testid="logoutBtn"]');
    await loggedInPage.click('[data-testid="logoutBtn"]');
    await loggedInPage.waitForSelector('[data-testid="loginUsername"]');

    // Log in as anotherValidUser
    loggedInPage = await automaton.login(anotherValidUser, 'logoutBtn');

    // Try to delete validUser's post
    const fetchResult = await loggedInPage.evaluate((postId, postRoute) => {
      /**
       * WARNING! BROWSER CONTEXT! Node code, closure, etc., do NOT work here!
       */
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

      return fetch(postRoute, requestOptions)
        .then((response) => response.text())
        .then((result) => result)
        .catch((err) => err);
    }, data.postId, ROUTES.POST);

    // FIXME: Brittle test; this string might change in the future!
    expect(fetchResult).toMatch(/.*You can't delete other users' posts.*/);
  });

  test('edits post from another user', async () => {
    // Make post as validUser
    const data = await automaton.makeCheckedPost(validUser,
      'Posted with Puppeteer!');

    let loggedInPage = data.page;

    // Log out from validUser
    await loggedInPage.waitForSelector('[data-testid="logoutBtn"]');
    await loggedInPage.click('[data-testid="logoutBtn"]');
    await loggedInPage.waitForSelector('[data-testid="loginUsername"]');

    // Log in as anotherValidUser
    loggedInPage = await automaton.login(anotherValidUser, 'logoutBtn');

    // Try to edit validUser's post
    const fetchResult = await loggedInPage.evaluate((postId, postRoute) => {
      /**
       * WARNING! BROWSER CONTEXT! Node code, closure, etc., do NOT work here!
       * FIXME: Code duplication.
       */
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

      const urlencoded = new URLSearchParams();
      urlencoded.append('postId', postId);
      urlencoded.append('editText', 'Edited a post from another user!');

      const requestOptions = {
        method: 'PUT',
        headers: myHeaders,
        body: urlencoded,
        redirect: 'follow',
      };

      return fetch(postRoute, requestOptions)
        .then((response) => response.text())
        .then((result) => result)
        .catch((err) => err);
    }, data.postId, ROUTES.POST);

    // FIXME: Brittle test; this string might change in the future!
    expect(fetchResult).toMatch(/.*You can't edit other users' posts*/);
  });
});
