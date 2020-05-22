"use strict";

require("dotenv").config();

const express               = require("express");
const app                   = express();
const bodyParser            = require("body-parser");
const getDatabase           = require("./database.js").getDatabase;
const setupRoutes           = require("./routes.js").setupRoutes;
const setupAuthentication   = require("./authentication.js").setupAuthentication;
const setupEmailer          = require("./emailer.js").setupEmailer;

getDatabase()
    .then((db) => {
        // Body parser. Be careful with this! You gotta use the appropriate parser depending
        // on the kind of contentType you're sending with jQuery! I had trouble with this
        // because I initially used bodyParser.urlencoded while sending data as "application/json"
        // with jQuery.
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({extended: false})); // needed for Passport

        // Static assets
        app.use(express.static(process.env.PUBLIC_DIR, {index: false}));

        // Pug templates
        app.set("views", process.env.VIEWS_DIR);
        app.set("view engine", "pug");

        // Set up stuff
        setupAuthentication(app, db);
        setupRoutes(app, db);
        setupEmailer();

        app.listen(process.env.PORT, (err) => {
            if(err) {
                console.log("Error while setting server to listen: " + err);
                return;
            }

            console.log("Server listening at port " + process.env.PORT + "...");
        });
    })
    .catch((err) => {
        // This is a critical failure which renders the entire site useless.
        // Setup a route to catch all GET requests and render an error template.

        console.log(err);
      
        app.use(express.static(process.env.PUBLIC_DIR, {index: false}));
        app.set("views", process.env.VIEWS_DIR);
        app.set("view engine", "pug");

        app.route("*")
            .get((req, res) => {
                return res.render("error", {message: "Critical failure: Could not connect to database"});
            });

        app.listen(process.env.PORT, (err) => {
            if(err) {
                console.log("Error while setting server to listen: " + err);
                return;
            }
    
            console.log("Server listening at port " + process.env.PORT + "...");
        });
    });
