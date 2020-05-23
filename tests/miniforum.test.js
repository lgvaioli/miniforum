"use strict";

require("dotenv").config();

const puppeteer     = require("puppeteer");
const faker         = require("faker");
const automaton     = require("./automaton").automaton;
const getDatabase   = require("../src/database").getDatabase;

jest.setTimeout(parseInt(process.env.JEST_TIMEOUT));

let browser;
let page;
let database;
const BASE_URL = process.env.TEST_BASEURL_NOPORT + process.env.PORT;

const routes = {
    loginUrl: BASE_URL,
};

const validUser = {
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
};

describe("Login form tests", () => {
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

        if(process.env.PUPPETEER_BROWSER && process.env.PUPPETEER_BROWSER == "true") {
            runHeadless = false;
        }

        const debugConfig = {
            headless: false,
            slowMo: parseInt(process.env.PUPPETEER_SLOWMO),
        };

        const headlessConfig = {
            headless: true,
            slowMo: parseInt(process.env.PUPPETEER_HEADLESS_SLOWMO),
        };

        browser = await puppeteer.launch(runHeadless ? headlessConfig : debugConfig);
        
        page = await browser.newPage();

        // Set Puppeteer's default timeout to 5 seconds; the default 30 seconds is
        // just obscene (at least for localhost).
        await page.setDefaultTimeout(5000);
    });
    
    test("logins with no username and no password", async () => {
        page = await automaton.login(page, routes.loginUrl, null, null);

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });

    test("logins with invalid username and no password", async () => {
        page = await automaton.login(page, routes.loginUrl, faker.internet.userName(),
                                    null);

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with invalid username and invalid password", async () => {
        page = await automaton.login(page, routes.loginUrl, faker.internet.userName(),
                                    faker.internet.password());

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and no password", async () => {
        page = await automaton.login(page, routes.loginUrl, validUser.username, null);

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and invalid password", async () => {
        page = await automaton.login(page, routes.loginUrl, validUser.username,
                                    faker.internet.password());

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and valid password", async () => {
        page = await automaton.login(page, routes.loginUrl, validUser.username,
                                    validUser.password);

        // Wait for logout button. We'll take that as a sign that we're effectively logged in
        await page.waitForSelector('[data-testid="logoutBtn"]');                                
    });

    test("logins with valid username and valid password, then logouts", async () => {
        page = await automaton.login(page, routes.loginUrl, validUser.username,
                                    validUser.password);
    
        // Wait for logout button and click
        await page.waitForSelector('[data-testid="logoutBtn"]');
        await page.click('[data-testid="logoutBtn"]');

        // Wait for loginUsername. We'll take that as a sign that we're effectively logged out
        await page.waitForSelector('[data-testid="loginUsername"]');
    });
});

describe("New account form tests", () => {
    test("creates new account with no input", async () => {
        // Go to login page
        await page.goto(routes.loginUrl);

        // Click "Create account" button
        await page.waitForSelector('[data-testid="createAccountBtn"]');
        await page.click('[data-testid="createAccountBtn"]');

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });

    test("creates new account with existing username and wrong email/password", async () => {
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

    test("creates new account", async () => {
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

describe("Posting tests", () => {
    // For simplicity's sake, clear database of all posts before each test
    beforeEach(async () => {
        database = await getDatabase();
        await database.clearPosts();
    });
    
    // Close puppeteer browser and database connection
    afterAll(async () => {
        await browser.close(); // last suite closes browser
        await database.close();
    });

    test("makes a post with valid input", async () => {
        page = await automaton.makePost(page, routes.loginUrl, validUser.username,
                                        validUser.password,
                                        "Posted with Puppeteer!");

        // Check that the post was actually made. Do note that this works only if there were no
        // previous posts.
        await page.waitForSelector('[data-testid="postContainer_test"]');
    });

    test("makes a post with no input", async () => {
        page = await automaton.makePost(page, routes.loginUrl, validUser.username,
                                        validUser.password, null);

        // Wait for failure toast
        await page.waitForSelector('[data-testid="toast-failure"]');
    });

    test("makes a post with invalid input (only whitespace)", async () => {
        page = await automaton.makePost(page, routes.loginUrl, validUser.username,
                                        validUser.password, "       ");

        // Wait for failure toast
        await page.waitForSelector('[data-testid="toast-failure"]');
    });

    test("deletes a post", async () => {
        page = await automaton.makePost(page, routes.loginUrl, validUser.username,
                                        validUser.password,
                                        "Posted with Puppeteer; we're gonna delete this one!");

        // Wait for and click the first delete button on the page
        await page.waitForSelector('[data-testid="deleteBtn_test"]');
        await page.click('[data-testid="deleteBtn_test"]');

        // Wait for success toast
        await page.waitForSelector('[data-testid="toast-success"]');
    });

    test("edits a post", async () => {
        page = await automaton.makePost(page, routes.loginUrl, validUser.username,
                                        validUser.password,
                                        "Posted with Puppeteer; we're gonna edit this one!");

        // Wait for and click the edit button
        await page.waitForSelector('[data-testid="editBtn_test"]');
        await page.click('[data-testid="editBtn_test"]');
        
        // Type some text in the editable textarea
        await page.waitForSelector('[data-testid="editable_textarea_test"]');
        await page.type('[data-testid="editable_textarea_test"]', " EDITED!");

        // Click the "Post edit" button
        await page.waitForSelector('[data-testid="postEditBtn"');
        await page.click('[data-testid="postEditBtn"');

        // Wait for success toast
        await page.waitForSelector('[data-testid="toast-success"]');

        // Check that the edit actually worked
        const postTextElement = await page.$('[data-testid="postText_test"');
        const text = await page.evaluate(postTextElement => postTextElement.textContent,
                                         postTextElement);

        expect(text).toMatch(/.* EDITED!$/);
    });
});
