# Miniforum

A simple miniforum (duh) powered by Node.js and PostgreSQL, made for educational purposes.

## Getting Started

Miniforum is designed to be easily deployable to Heroku, though deployment to localhost is also
possible (and highly recommended for testing). Given that deploying to localhost is easier
and something you'll really want to do, we'll start from there, and we'll cover Heroku deployment
further down below.

### Deploying to localhost

You will need to install need the following:
* [Node](https://nodejs.org/)
* [PostgreSQL](https://www.postgresql.org/)

Then, install the project's dependencies by running:
```
npm install
```

#### Setting up env variables in localhost

Following the [Twelve-Factor App methodology](https://12factor.net/), Miniforum aims to store
deployment-specific configuration in the environment (whether this be localhost or Heroku).
In localhost, following a common Node practice, config variables are stored in a file called
*.env*, placed at the root directory of the project (i.e. the same directory where this README is
located). For deployment and security reasons (e.g. I don't want you to have my database
credentials and so on), this file is *not* supplied and you must therefore create it yourself 
following this example:
```
#################
# Server config #
#################

# Server will listen at this port
PORT=3000

# Server will serve static assets (e.g. css/html) from this directory
PUBLIC_DIR=public

# Server will render views (e.g. pug files) from this directory
VIEWS_DIR=views


###################
# Database config #
###################

# Database to connect to. Please read PostgreSQL's docs to find out more about this.
DATABASE_URL=postgresql://<postgres_user>:<postgres_password>@<host>:<port>/<database_name>

# This is necessary to connect to a PostgreSQL's in localhost. This line should NOT be
# in a Heroku deployment (please don't set this to 'false' but DELETE the whole line).
DATABASE_NO_SSL=true


###########################
# Password-related config #
###########################

# Number of bcrypt's salt rounds. Read bcrypt's docs for more info.
BCRYPT_SALTROUNDS=12

# Password used to encrypt cookies. To know why you probably don't want to set this
# to something like '123', read the following article:
# https://martinfowler.com/articles/session-secret.html
SESSION_SECRET=<some strong password>


#############################
# Emailer config (optional) #
#############################

EMAILER_NAME='XYZ Miniforum'
EMAILER_VALIDATED_EMAIL=sendgrid_validated_email@gmail.com
SENDGRID_API_KEY='your_sendgrid_api_key_here'


#############################
# Testing config (optional) #
#############################
DEBUG=true
PUPPETEER_SLOWMO=50
PUPPETEER_HEADLESS_SLOWMO=3
JEST_TIMEOUT=60000
TEST_BASEURL_NOPORT='http://localhost:'
TEST_VALID_USERNAME=test_validusername
TEST_VALID_PASSWORD=test_validusername
```

Miniforum implements basic password reset by sending you an email with a new, randomly
generated password using [Sendgrid](https://sendgrid.com/). If you choose to use this feature,
you must provide the relevant variables. Otherwise, the site still works but shows an error
page when the user tries to reset his/her password.

The testing variables are optional if you don't plan to run [Jest](https://jestjs.io/) to test
the site. If you're experiencing false negatives when testing, please read the file
*tests/miniforum.test.js* and experiment adjusting the PUPPETEER_HEADLESS_SLOWMO variable.

#### Setting up PostgreSQL

Once you have installed PostgreSQL, you must setup a database for the site to use. I won't be
covering here how to setup a database because it's beyond the scope of this document.
Once you have a database setup, don't forget to copy its URL (something like *postgresql://<postgres_user>:<postgres_password>@<host>:<port>/<database_name>*) in the *.env* file, like explained above.

Then, you need to create the tables necessary for Miniforum to work. You can do this easily
by running the script *postgresql/createTables.sql* (the easiest way is probably just to copy
and paste it and run it in pgAdmin). If you plan to test the site with Jest, please
note that you have to manually create a testing user through the site's UI (merely making an
INSERT with raw SQL won't work given how password storage works), and this user's credentials
must match the *TEST_VALID_USERNAME* and *TEST_VALID_PASSWORD* env variables in order for testing
to work.

Finally, you need to create the tables necessary for [Connect PG Simple](https://www.npmjs.com/package/connect-pg-simple), the data store Miniforum uses to store cookies. You can easily do this by
running the [*table.sql*](https://github.com/voxpelli/node-connect-pg-simple/blob/HEAD/table.sql) script provided by the folks of Connect PG Simple.

#### Running Miniforum

By now you should have everything you need to run Miniforum in localhost. Let's give it a try!
You can run the server by issuing the following command in the root directory of the project:

```
npm start
```

If everything went fine, you should see something like this in the console:

```
Connected successfully to database!
Server listening at port 3000...
```

Now all you have to do is launch your browser and go to *http://localhost:3000/* and you should
see Miniforum in action. If you do: congrats! You have successfully deployed Miniforum to localhost.
Keep reading if you want to deploy Miniforum to Heroku.

### Deploying to Heroku

TODO: write me!
