"use strict";

require("dotenv").config();

const express       = require("express");
const app           = express();
const bodyParser    = require("body-parser");

// Local modules
const setupRoutes           = require("./routes.js").setupRoutes;
const setupAuthentication   = require("./authentication.js").setupAuthentication;

// Body parser. Be careful with this! You gotta use the appropriate parser depending
// on the kind of contentType you're sending with jQuery! I had trouble with this
// because I initially used bodyParser.urlencoded while sending data as "application/json"
// with jQuery.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false})); // needed for Passport

// Static assets
app.use(express.static(process.env.PUBLIC_DIR, {index: false}));

setupAuthentication(app);

setupRoutes(app);

app.listen(process.env.PORT, (err) => {
    if(err) {
           console.log("Error while setting server to listen: " + err);
        return;
    }

    console.log("Server listening at port " + process.env.PORT + "...");
});
