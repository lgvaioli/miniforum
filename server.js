"use strict";

require("dotenv").config();

const express               = require("express");
const app                   = express();
const bodyParser            = require("body-parser");
const { Client }            = require("pg");
const setupRoutes           = require("./routes.js").setupRoutes;
const setupAuthentication   = require("./authentication.js").setupAuthentication;

// PostgreSQL
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_NO_SSL ? false : true,
});

client.connect((err) => {
    if (err) {
        console.log("Could not connect to database: " + err);
        return;
    }

    console.log("Connected successfully to database!");

    // Body parser. Be careful with this! You gotta use the appropriate parser depending
    // on the kind of contentType you're sending with jQuery! I had trouble with this
    // because I initially used bodyParser.urlencoded while sending data as "application/json"
    // with jQuery.
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false})); // needed for Passport

    // Static assets
    app.use(express.static(process.env.PUBLIC_DIR, {index: false}));

    setupAuthentication(app, client);

    setupRoutes(app, client);

    app.listen(process.env.PORT, (err) => {
        if(err) {
            console.log("Error while setting server to listen: " + err);
            return;
        }

        console.log("Server listening at port " + process.env.PORT + "...");
    });
})
