"use strict";

require("dotenv").config();

const puppeteer = require("puppeteer");
const faker     = require("faker");

// Change Jest's default timeout from 5 seconds to 1 minute.
// All that really matters here is that Puppeteer's default timeout be
// lower than Jest's timeout (and given that Puppeteer's default timeout is
// 30 seconds, setting Jest's timeout to 1 minute to be safe seems reasonable);
// otherwise our test errors will not be very informative because they will mostly
// consist of Jest's timeouts, and what is worse, timeouts at the level of tests,
// meaning you won't actually see where in the test the code is failing (you will
// just see that the test in question has timed out). Remove this one line of
// code and try to await for a nonexistent selector with Puppeteer and you'll
// see exactly what I mean.
jest.setTimeout(parseInt(process.env.JEST_TIMEOUT));

let browser;
let page;
const BASE_URL = process.env.TEST_BASEURL_NOPORT + process.env.PORT;

const routes = {
    loginUrl: BASE_URL,
};

describe("Login tests", () => {
    beforeAll(async () => {
        browser = await puppeteer.launch(
            process.env.DEBUG ? {headless: false, slowMo: 50} : {});
        page = await browser.newPage();
    });
    
    afterAll(() => {
        browser.close();
    });

    test("logins with invalid username and no password", async () => {
        await page.goto(routes.loginUrl);
    
        // Wait for loginUsername and type invalid username
        await page.waitForSelector('[data-testid="loginUsername"]');
        await page.type('[data-testid="loginUsername"]', faker.internet.userName());
    
        // Wait for login button and click it
        await page.waitForSelector('[data-testid="loginLoginBtn"]');
        await page.click('[data-testid="loginLoginBtn"]');
    
        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with invalid username and invalid password", async () => {
        await page.goto(routes.loginUrl);
    
        // Wait for loginUsername and type invalid username
        await page.waitForSelector('[data-testid="loginUsername"]');
        await page.type('[data-testid="loginUsername"]', faker.internet.userName());
    
        // Wait for loginPassword and type invalid password
        await page.waitForSelector('[data-testid="loginPassword"]');
        await page.type('[data-testid="loginPassword"]', faker.internet.password());
    
        // Wait for login button and click it
        await page.waitForSelector('[data-testid="loginLoginBtn"]');
        await page.click('[data-testid="loginLoginBtn"]');
    
        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and no password", async () => {
        await page.goto(routes.loginUrl);
    
        // Wait for loginUsername and type valid username
        await page.waitForSelector('[data-testid="loginUsername"]');
        await page.type('[data-testid="loginUsername"]', process.env.TEST_VALID_USERNAME);
    
        // Wait for login button and click it
        await page.waitForSelector('[data-testid="loginLoginBtn"]');
        await page.click('[data-testid="loginLoginBtn"]');
    
        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and invalid password", async () => {
        await page.goto(routes.loginUrl);
    
        // Wait for loginUsername and type valid username
        await page.waitForSelector('[data-testid="loginUsername"]');
        await page.type('[data-testid="loginUsername"]', process.env.TEST_VALID_USERNAME);
    
        // Wait for loginUsername and type invalid password
        await page.waitForSelector('[data-testid="loginPassword"]');
        await page.type('[data-testid="loginPassword"]', faker.internet.password());
    
        // Wait for login button and click it
        await page.waitForSelector('[data-testid="loginLoginBtn"]');
        await page.click('[data-testid="loginLoginBtn"]');
    
        // Wait for error message
        await page.waitForSelector('[data-testid="errorMsg"]');
    });
    
    test("logins with valid username and valid password", async () => {
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
    
        // Wait for logout button. We'll take that as a sign that we're effectively logged in
        await page.waitForSelector('[data-testid="logoutBtn"]');
    });

    test("logins with valid username and valid password, then logouts", async () => {
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
    
        // Wait for logout button and click
        await page.waitForSelector('[data-testid="logoutBtn"]');
        await page.click('[data-testid="logoutBtn"]');

        // Wait for loginUsername. We'll take that as a sign that we're effectively logged out
        await page.waitForSelector('[data-testid="loginUsername"]');
    });
});
