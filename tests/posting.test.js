"use strict";

require("dotenv").config();

const puppeteer     = require("puppeteer");
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

// Time (in ms) we wait after some operations which take a little while to complete.
// This should be as little as possible (time is money!), while allowing operations
// which take some time to take effect (like editing or deleting a post) to actually work.
// 500 ms seems to be working fine in localhost (probably not enough for production testing).
const GRACE_PERIOD = 500;

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

    test("makes a post", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
            validUser.password, "Posted with Puppeteer!");

        // Check that the post was actually made. Do note that this works only if there were no
        // previous posts.
        await page.waitForSelector(".post-container");
    });

    test("deletes a post", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
            validUser.password, "Posted with Puppeteer; we're gonna delete this one!");

        // Setup callback to dismiss alert
        page.on("dialog", async (dialog) => {
            await dialog.dismiss();
        });

        // Wait for and click the first delete button on the page
        await page.waitForSelector('[data-testid="deleteBtn_test"]');
        await page.click('[data-testid="deleteBtn_test"]');

        // Give it some time
        await page.waitFor(GRACE_PERIOD);

        const postElement = await page.$(".post-container");
        expect(postElement).toBeNull();
    });

    test("edits a post", async () => {
        const page = await automaton.makePost(browser, routes.loginUrl, validUser.username,
                        validUser.password, "Posted with Puppeteer; we're gonna edit this one!");

        // Setup callback to dismiss alert
        page.on("dialog", async (dialog) => {
            await dialog.dismiss();
        });

        // Wait for and click the edit button
        await page.waitForSelector('[data-testid="editBtn_test"]');
        await page.click('[data-testid="editBtn_test"]');
        
        // Type some text in the editable textarea
        await page.waitForSelector('[data-testid="editable_textarea_test"]');
        await page.type('[data-testid="editable_textarea_test"]', " EDITED!");

        // Click the "Post edit" button
        await page.waitForSelector('[data-testid="postEditBtn"');
        await page.click('[data-testid="postEditBtn"');

        // Give it some time
        await page.waitFor(GRACE_PERIOD);

        // Check that the edit actually worked
        const postTextElement = await page.$('[data-testid="postText_test"');
        const text = await page.evaluate(postTextElement => postTextElement.textContent,
                                         postTextElement);

        expect(text).toMatch(/.* EDITED!$/);
    });
});
