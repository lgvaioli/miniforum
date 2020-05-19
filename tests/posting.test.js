"use strict";

require("dotenv").config();

const puppeteer = require("puppeteer");
const faker     = require("faker");
const getDatabase  = require("../src/database").getDatabase;

// FIXME: code duplication. Find an elegant way to deal with this. We basically need a robust mechanism
// to do a beforeAll() before ALL files, and not just this one.
jest.setTimeout(60000);

let browser;
let page;
let database;
const BASE_URL = process.env.TEST_BASEURL_NOPORT + process.env.PORT;

const routes = {
    loginUrl: BASE_URL,
};

describe("Posting tests", () => {
    // Launch puppeteer browser and clear database of all posts
    beforeAll(async () => {
        browser = await puppeteer.launch(
            process.env.DEBUG ? {headless: false, slowMo: 50} : {});
        page = await browser.newPage();
        database = await getDatabase();
        await database.clearPosts();
    });
    
    // Close puppeteer browser and database connection
    afterAll(async () => {
        await browser.close();
        await database.close();
    });

    test("makes a post", async () => {
        await page.goto(routes.loginUrl);
    
        // Wait for loginUsername and type valid username
        await page.waitForSelector('[data-testid="loginUsername"]');
        await page.type('[data-testid="loginUsername"]', process.env.TEST_VALID_USERNAME);
    
        // Wait for loginUsername and type valid password
        await page.waitForSelector('[data-testid="loginPassword"]');
        await page.type('[data-testid="loginPassword"]', process.env.TEST_VALID_PASSWORD);
    
        // Wait for login button and click it
        await page.waitForSelector('[data-testid="loginLoginBtn"]');
        await page.click('[data-testid="loginLoginBtn"]');
    
        // Post something. For simplicity's sake, all the posts should be removed from the
        // database before testing this. Otherwise we have to overcomplicate stuff just to
        // make sure we select the correct post.
        const postMsg = "This post was made automatically with Puppeteer!";
        await page.waitForSelector('[data-testid="userInput"]');
        await page.type('[data-testid="userInput"]', postMsg);
        await page.waitForSelector('[data-testid="postMessageBtn"]');
        await page.click('[data-testid="postMessageBtn"]');

        // Check that the post was actually made. Do note that this works only if there were no
        // previous posts.
       const postElement = await page.$(".post-container");
    });
});
