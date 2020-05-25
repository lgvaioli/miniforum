# Miniforum

A simple miniforum (duh) powered by Node.js and PostgreSQL, made for (my own) educational purposes.

Check out the [live version](https://lgv-miniforum.herokuapp.com/)! (it might take a little
while to load because it's hosted on Heroku's free plan).

## Getting Started

Miniforum is designed to be easily deployable to Heroku, though deployment to localhost is also
possible (and highly recommended for testing). Given that deploying to localhost is easier
and something you'll really want to do, we'll start from there, and we'll cover Heroku deployment
further down below.

### Deploying to localhost

First, you will need to install the following:
* [Node](https://nodejs.org/)
* [PostgreSQL](https://www.postgresql.org/)

Then, install the project's dependencies by running:
```
npm install
```
Next you'll need to setup PostgreSQL.

#### Setting up PostgreSQL

Miniforum uses PostgreSQL to store the posts users make, among other things, so you'll need to install it and setup at least one database. I won't be covering here how to get PostgreSQL up and running because it's beyond the scope of this document. Once you have PostgreSQL installed and running, you have to:

* Create the tables necessary for Miniforum to work. You can do this easily by **running the script *postgresql/createTables.sql*** (the easiest way is probably just to copy and paste it and run it in pgAdmin).

* Create the tables necessary for [Connect PG Simple](https://www.npmjs.com/package/connect-pg-simple), the data store Miniforum uses to store cookies. You can easily do this by
**running the [*table.sql*](https://github.com/voxpelli/node-connect-pg-simple/blob/HEAD/table.sql)** script provided by the folks of Connect PG Simple.


#### Setting up env variables in localhost

Following the [Twelve-Factor App methodology](https://12factor.net/), Miniforum aims to store
deployment-specific configuration in the environment (whether this be localhost or Heroku).
In localhost, following a common Node practice, config variables are stored in a file called
*.env*, placed at the root directory of the project (i.e. the same directory where this README is
located). For deployment and security reasons (e.g. I don't want you to have my database
credentials and so on), this file is *not* supplied and **you must therefore create it yourself** 
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

# This is necessary to connect to a PostgreSQL's database in localhost. This line should be set to
# true when deploying to localhost, and false when deploying to Heroku.
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
PUPPETEER_BROWSER=true
PUPPETEER_SLOWMO=50
PUPPETEER_HEADLESS_SLOWMO=3
JEST_TIMEOUT=60000
TEST_BASEURL_NOPORT='http://localhost:'
TEST_VALID_USERNAME=<your test user username, read further down below>
TEST_VALID_PASSWORD=<your test user password, read further down below>
```

Miniforum implements basic password reset by sending you an email with a new, randomly
generated password using [Sendgrid](https://sendgrid.com/). If you choose to use this feature,
you must provide the relevant variables. Otherwise, the site still works but shows an error
page when the user tries to reset his/her password.

The testing variables are optional if you don't plan to run [Jest](https://jestjs.io/) to test
the site.

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
see Miniforum in action. If you do: congrats! You have successfully deployed Miniforum to localhost. Keep reading on if you want to run the test suite.

#### Testing in localhost

##### Setting up a test user in Miniforum #####

The first thing you have to do if you want to run Miniforum's tests is to create a test user account through Miniforum's UI. This is necessary given how password storage works in Miniforum: for security reasons, it doesn't actually store users' passwords, but rather their hashes. What this means in practical terms is that a testing user cannot be automatically created through raw SQL in a script.

The test user's username and password can be whatever you want, just don't forget them because you will need them to set a couple of variables in the *.env* file.

##### Setting up testing variables in .env file #####
To test your new Miniforum deployment in localhost, first make sure that the following env variables are set in your *.env* file:
```
PUPPETEER_BROWSER=true
PUPPETEER_SLOWMO=50
PUPPETEER_HEADLESS_SLOWMO=3
JEST_TIMEOUT=60000
TEST_BASEURL_NOPORT='http://localhost:'
TEST_USERNAME=<your test user username from the previous step>
TEST_PASSWORD=<your test user password from the previous step>
```
The ```PUPPETEER_BROWSER``` variable controls whether [Puppeteer](https://github.com/puppeteer/puppeteer) runs in headless mode (i.e. you don't see anything and Puppeteer just runs quietly in the console) or not (i.e. you actually see a testing browser doing stuff).

Setting ```PUPPETEER_BROWSER=true``` makes Puppeteer launch a testing browser. This is the slower, safer way of running tests. You probably want to run this if you made substantial changes to Miniforum's code.

Setting ```PUPPETEER_BROWSER=false``` or deleting/commenting the line makes Puppeteer run in headless mode. This is the faster, less safe way of running tests. You probably want to run this if you made small changes to Miniforum's code. Think of it as a *quick and dirty* test.

You probably want to run with ```PUPPETEER_BROWSER=true``` at least *once* to make sure everything works fine, because Puppeteer's behavior when running headless seems to be somewhat unpredictable and false negatives are usual. If you get too many false negatives when running headless, you can try to set the ```PUPPETEER_HEADLESS_SLOWMO``` variable to something higher, like 10 or 15 (```PUPPETEER_HEADLESS_SLOWMO``` basically tells Puppeteer to wait by that amount of milliseconds before each of its operations, so do have in mind that this slows down Puppeteer significantly). ```PUPPETEER_HEADLESS_SLOWMO=3``` seems to work reasonably well (i.e. I get *some* false negatives but not too many and not too often) for my machine (Pentium G4560), but if your machine is faster, you might need to increase it.

You should probably leave the rest of the variables as they are, unless you know what you're doing.

Once you have checked that you have the necessary env variables set, you can run the tests with:
```
npm test
```

This runs Jest on all tests suites in verbose mode. Give it a little while; it takes ~32 seconds to finish in headless mode in my machine (Pentium G4560), and ~166 seconds to finish in browser mode.

### Deploying to Heroku

TODO: Write me!
