# Miniforum

A simple miniforum (duh) powered by Node.js and PostgreSQL, made for (my own) educational purposes.

Check out the [live version](https://lgv-miniforum.herokuapp.com/)! (it might take a little
while to load because it's hosted on Heroku's free plan).

## Getting Started

Miniforum is designed to be easily deployable to Heroku, though deployment to localhost is also
possible (and highly recommended for testing and goofing around with the code).
You can deploy to localhost in two ways: manually (TODO: insert link here) or with Docker. Deploying with Docker is easier and is thus the recommended way of deploying to localhost.

### Deploying to localhost: Common stuff

#### Creating *.env* file

Whether you choose to deploy to localhost manually or with Docker, you'll need to create an *.env* file.

Following the [Twelve-Factor App methodology](https://12factor.net/), Miniforum aims to store
deployment-specific configuration in the environment. In localhost, config variables are stored in a file called *.env*, placed at the root directory of the project (i.e. the same directory where this README is located). For deployment and security reasons (e.g. I don't want you to have my database credentials, commiting deployment-specific info to version control is a terrible practice, and so on), this file is *not* supplied and **you must therefore create it yourself** by copying and modifying the following example where necessary:
```
################
# Server stuff #
################
PORT=3000
PUBLIC_DIR=public
VIEWS_DIR=views


##############
# Node stuff #
##############
NODE_ENV=production


###########################
# Docker localhost deploy #
###########################
# WARNING! Do NOT include this section if you're deploying to localhost manually!
# Set POSTGRES_PASSWORD to a strong password and replace <strong password> in DATABASE_URL with it.
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong password>
DATABASE_URL=postgresql://postgres:<strong password>@postgres:5432/postgres
DATABASE_TEST_URL=postgresql://postgres:<strong password>@localhost:6000/postgres
LOCALHOST_DB_BINDPORT=6000
DATABASE_NO_SSL=true


###########################
# Manual localhost deploy #
###########################
# WARNING! Do NOT include this section if you're deploying to localhost with Docker!
# Note that DATABASE_URL and DATABASE_TEST_URL are equal. This is as intended.
DATABASE_URL=postgresql://postgres:<your postgresql password>@localhost:5432/postgres
DATABASE_TEST_URL=postgresql://postgres:<your postgresql password>@localhost:5432/postgres
DATABASE_NO_SSL=true


#####################
# Bcrypt/auth stuff #
#####################
# Set SESSION_SECRET to a strong password.
BCRYPT_SALTROUNDS=12
SESSION_SECRET=<some strong password>


########################################
# Emailer stuff (optional, read below) #
########################################
# WARNING! Do NOT include this section if you don't plan to use Sendgrid!
EMAILER_NAME=<name>
EMAILER_VALIDATED_EMAIL=<Sengrid validated email>
SENDGRID_API_KEY=<Sengrid API key>


########################################
# Testing stuff (optional, read below) #
########################################
# WARNING! Do NOT include this section if you don't plan to test Miniforum!
PUPPETEER_BROWSER=false
PUPPETEER_SLOWMO=50
PUPPETEER_HEADLESS_SLOWMO=10
PUPPETEER_TIMEOUT=5000
JEST_TIMEOUT=60000
```

Config sections marked as *(optional, read below)* should be omitted if you don't plan to use the feature in question, e.g., if you don't plan to test Miniforum, you should omit the entire *Testing config (optional)* section in your *.env* file.

Miniforum implements basic password reset by sending you an email with a new, randomly
generated password using [Sendgrid](https://sendgrid.com/). If you choose to use this feature,
you must provide the relevant variables. Otherwise, the site still works but shows an error
page when the user tries to reset his/her password.

The testing variables are optional if you don't plan to run [Jest](https://jestjs.io/) to test
the site.

### Deploying to localhost with Docker

1. Make sure you created an appropriate *.env* file (read above).
2. Install [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/install/).
3. Spin up the containers with Docker Compose: `docker-compose up -d`.
4. Launch your browser and go to *http://localhost:3000/*. If everything worked, you should see Miniforum in action!

### Deploying to localhost manually

1. Make sure you created an appropriate *.env* file (read above).
2. Install [Node](https://nodejs.org/) and [PostgreSQL](https://www.postgresql.org/).
3. Setup PostgreSQL (read below).
4. Install the project's dependencies by running `npm install` in the project's root directory.
5. Run the server with `npm start` in the project's root directory.
6. Launch your browser and go to *http://localhost:3000/*. If everything worked, you should see Miniforum in action!

#### Setting up PostgreSQL

Miniforum uses PostgreSQL to store the posts users make, among other things, so you'll need to install it and setup at least one database. I won't be covering here how to get PostgreSQL up and running because it's beyond the scope of this document. Once you have PostgreSQL installed and running, you have to:

* Create the tables necessary for Miniforum to work. You can do this easily by **running the script *postgresql/createTables.sql*** (the easiest way is probably just to copy and paste it and run it in pgAdmin).

### Testing in localhost (Docker and manual)

Testing works the same way whether you deployed manually or with Docker:

1. Make sure Miniforum is running.
2. Run the tests with `npm test` in the project's root directory.
