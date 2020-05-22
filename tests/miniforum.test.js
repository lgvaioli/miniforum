"use strict";

require("dotenv").config();

const puppeteer     = require("puppeteer");
const faker         = require("faker");
const automaton     = require("./automaton").automaton;
const getDatabase   = require("../src/database").getDatabase;

jest.setTimeout(parseInt(process.env.JEST_TIMEOUT));

let browser;
let database;
const BASE_URL = process.env.TEST_BASEURL_NOPORT + process.env.PORT;

const routes = {
    loginUrl: BASE_URL,
};

const validUser = {
    username: process.env.TEST_VALID_USERNAME,
    password: process.env.TEST_VALID_PASSWORD,
};

describe("Posting tests", () => {
    // Launch puppeteer browser and clear database of all posts
    beforeAll(async () => {
        browser = await puppeteer.launch(
            process.env.DEBUG ? {headless: false, slowMo: 50} : {});
    });

    // For simplicity's sake, clear database of all posts before each test
    beforeEach(async () => {
        database = await getDatabase();
        await database.clearPosts();
    });
    
    // Close puppeteer browser and database connection
    afterAll(async () => {
        await browser.close();
        await database.close();
    });

    test("dummy (do nothing but wait for a little while)", async () => {
        const page = await browser.newPage();
        page.waitFor(1000);
    });

    test("makes a post with valid input", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
            validUser.password, "Posted with Puppeteer!");

        // Check that the post was actually made. Do note that this works only if there were no
        // previous posts.
        await page.waitForSelector(".post-container");
    });

    test("makes a post with no input", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
            validUser.password, null);

        // Wait for failure toast
        await page.waitForSelector('[data-testid="toast-failure"]');
    });

    test("makes a post with invalid input (only whitespace)", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
            validUser.password, "       ");

        // Wait for failure toast
        await page.waitForSelector('[data-testid="toast-failure"]');
    });

    test("deletes a post", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
            validUser.password, "Posted with Puppeteer; we're gonna delete this one!");

        // Wait for and click the first delete button on the page
        await page.waitForSelector('[data-testid="deleteBtn_test"]');
        await page.click('[data-testid="deleteBtn_test"]');

        // Wait for success toast
        await page.waitForSelector('[data-testid="toast-success"]');
    });

    test("edits a post", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
                        validUser.password, "Posted with Puppeteer; we're gonna edit this one!");

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

describe("Login tests", () => {
    beforeAll(async () => {
        browser = await puppeteer.launch(
            process.env.DEBUG ? {headless: false, slowMo: 50} : {});
    });
    
    afterAll(() => {
        browser.close();
    });

    test("logins with no username and no password", async () => {
        const page = await automaton.login(browser, routes.loginUrl, null, null);

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });

    test("logins with invalid username and no password", async () => {
        const page = await automaton.login(browser, routes.loginUrl, faker.internet.userName(),
                                            null);

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with invalid username and invalid password", async () => {
        const page = await automaton.login(browser, routes.loginUrl, faker.internet.userName(),
                                            faker.internet.password());

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and no password", async () => {
        const page = await automaton.login(browser, routes.loginUrl, validUser.username, null);

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and invalid password", async () => {
        const page = await automaton.login(browser, routes.loginUrl, validUser.username,
                                            faker.internet.password());

        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and valid password", async () => {
        const page = await automaton.login(browser, routes.loginUrl, validUser.username,
                                            validUser.password);

        // Wait for logout button. We'll take that as a sign that we're effectively logged in
        await page.waitForSelector('[data-testid="logoutBtn"]');                                
    });

    test("logins with valid username and valid password, then logouts", async () => {
        const page = await automaton.login(browser, routes.loginUrl, validUser.username,
                                            validUser.password);
    
        // Wait for logout button and click
        await page.waitForSelector('[data-testid="logoutBtn"]');
        await page.click('[data-testid="logoutBtn"]');

        // Wait for loginUsername. We'll take that as a sign that we're effectively logged out
        await page.waitForSelector('[data-testid="loginUsername"]');
    });
});