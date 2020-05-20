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

describe("Posting tests", () => {
    // Launch puppeteer browser and clear database of all posts
    beforeAll(async () => {
        browser = await puppeteer.launch(
            process.env.DEBUG ? {headless: false, slowMo: 50} : {});
        database = await getDatabase();
        await database.clearPosts();
    });
    
    // Close puppeteer browser and database connection
    afterAll(async () => {
        await browser.close();
        await database.close();
    });

    test("makes a post", async () => {
        const loggedPage = await automaton.login(browser, routes.loginUrl, validUser.username,
                                                 validUser.password);

        // Post something. For simplicity's sake, all the posts should be removed from the
        // database before testing this. Otherwise we have to overcomplicate stuff just to
        // make sure we select the correct post.
        const postMsg = "This post was made automatically with Puppeteer!";
        await loggedPage.waitForSelector('[data-testid="userInput"]');
        await loggedPage.type('[data-testid="userInput"]', postMsg);
        await loggedPage.waitForSelector('[data-testid="postMessageBtn"]');
        await loggedPage.click('[data-testid="postMessageBtn"]');

        // Check that the post was actually made. Do note that this works only if there were no
        // previous posts.
        await loggedPage.$(".post-container");
    });
});
