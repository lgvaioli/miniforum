# Miniforum

A simple miniforum (duh) powered by Node.js and PostgreSQL, made for (my own) educational purposes.

Check out the [live version](https://lgv-miniforum.herokuapp.com/)! (it might take a little
while to load because it's hosted on Heroku's free plan).

## Getting Started

Miniforum is designed to be easily deployable to Heroku, though deployment to localhost is also
possible (and highly recommended for testing and goofing around with the code).
You can deploy to localhost in two ways: manually or with Docker. Deploying with Docker is easier and is thus the recommended way of deploying to localhost.

### Deploying to localhost: Common stuff

#### Creating the *.env* file

Whether you choose to deploy to localhost manually or with Docker, you'll need to create an *.env* file.

Following the [Twelve-Factor App methodology](https://12factor.net/), Miniforum aims to store
deployment-specific configuration in the environment. In localhost, config variables are stored in a file called *.env*, placed at the root directory of the project (i.e. the same directory where this README is located). For deployment and security reasons (e.g. I don't want you to have my database credentials, commiting deployment-specific info to version control is a terrible practice, and so on), this file is *not* supplied and **you must therefore create it yourself** by copying and modifying the following example where necessary:
```
################
# Server stuff #
################
PORT=3000
#PUBLIC_DIR=public


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
#BCRYPT_SALTROUNDS=12
SESSION_SECRET=<some strong password>


########################################
# Emailer stuff (optional, read below) #
########################################
# WARNING! Do NOT include this section if you don't plan to use Sendgrid!
EMAILER_NAME=<name>
EMAILER_VALIDATED_EMAIL=<Sengrid validated email>
SENDGRID_API_KEY=<Sengrid API key>


#################
# Testing stuff #
#################
#PUPPETEER_HEADLESS=true
#PUPPETEER_SLOWMO=50
#PUPPETEER_HEADLESS_SLOWMO=10
#PUPPETEER_TIMEOUT=5000
#JEST_TIMEOUT=60000
```

Config sections marked as *(optional, read below)* should be omitted if you don't plan to use the feature in question, e.g., if you don't plan to use the emailer service, you should omit the entire *Emailer stuff (optional, read below)* section in your *.env* file.

The variables in the lines starting with *#* are automatically set behind the scenes to a sane default, e.g., if you don't explicitly set `PUBLIC_DIR` by uncommenting that line, Miniforum will automatically set it to `public`. You should probably leave these lines starting with *#* alone, unless you know what you're doing; I put them there just for documentation purposes.

Miniforum implements basic password reset by sending you an email with a new, randomly
generated password using [Sendgrid](https://sendgrid.com/). If you choose to use this feature,
you must provide the relevant variables. Otherwise, the site still works but shows an error when the user tries to reset his/her password.

Docker and manual localhost deploys are mutually exclusive: If you wish to deploy with Docker, you must not include the *Manual localhost deploy* (you can also just comment it with *#*) section, and viceversa. In my own setup, I keep both sections in my *.env* file and just comment the section I don't want to use; that way I can easily switch between a Docker/manual deploy.

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

* Create the tables necessary for Miniforum to work. You can do this easily by **running the script *postgresql/createTables.sql***. The easiest way is probably just to copy and paste it in pgAdmin and run it from there.

### Testing in localhost (Docker and manual)

Testing works the same way whether you deployed manually or with Docker:

1. Make sure Miniforum is running.
2. Run the tests with `npm test` in the project's root directory.

### Deploying to Heroku

The basic steps to deploy to Heroku are the following:

1. Create a Heroku app.
2. Provision a Postgres database with the *Heroku Postgres* add-on.
3. Configure the env variables with `heroku config`.
4. Push the app to Heroku with `git push heroku`.

I won't cover steps 1 and 2 because they are outside the scope of
this document. Heroku has an [excellent tutorial](https://devcenter.heroku.com/articles/getting-started-with-nodejs) covering Node.js deployment which can help you to get started.

After you've completed steps 1 and 2, you have to provision *at least* the following variables with the
`heroku config:set` command:
```
DATABASE_NO_SSL:false
DATABASE_URL:<your Heroku Postgres database URL>
NODE_ENV:production
SESSION_SECRET:<some strong password>
```

Optionally, if you want to use the emailer service to reset passwords, you have to provision the following variables:
```
EMAILER_NAME:<your emailer name>
EMAILER_VALIDATED_EMAIL:<sendgrid validated email>
SENDGRID_API_KEY:<your sendgrid api key>
```

After all that is done, you just have to push it all to Heroku with:

`git push heroku`

and you're done. Open up your Heroku Miniforum app with `heroku open` and you should see it running!
