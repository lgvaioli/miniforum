require('dotenv').config();

const faker = require('faker');
const { Database } = require('../src/database');

let testDatabase = null;

/**
 * Creates a user object with faker.
 * @returns {Object} An object { username, password, email }.
 */
function createFakeUser() {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
  };
}

describe('Database class tests', () => {
  // Sets up test database before tests are run
  beforeAll(async () => {
    testDatabase = new Database(process.env.DATABASE_TEST_URL);

    /**
     * Clear database of users and posts, in the incredibly rare albeit possible
     * situation where faker generates clashing users.
     */
    await testDatabase.clearAll();
  });

  // Closes database connection after all tests are run
  afterAll(async () => {
    await testDatabase.clearAll();
    await testDatabase.close();
  });

  test('createUser', () => {
    // Create new user with createUser and check results
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then((userRow) => {
        expect(userRow.username).toBe(newUser.username);
        expect(userRow.email).toBe(newUser.email);
      });
  });

  test('findUserById', () => {
    // Create new user and then look it up with findUserById
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then((userRow) => testDatabase
        .findUserById(userRow.id)
        .then((result) => {
          expect(result.username).toBe(newUser.username);
          expect(result.email).toBe(newUser.email);
        }));
  });

  test('findUserByName', () => {
    // Create new user and then look it up with findUserByName
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then((userRow) => testDatabase
        .findUserByName(userRow.username)
        .then((result) => {
          expect(result.username).toBe(newUser.username);
          expect(result.email).toBe(newUser.email);
        }));
  });

  test('changePassword', () => {
    // Create new user and then change password
    const newUser = createFakeUser();
    const newPassword = faker.internet.password();

    return testDatabase
      .createUser(newUser)
      .then((userRow) => testDatabase
        .changePassword(userRow.id, newPassword)
        .then((result) => {
          expect(result).toBe(newPassword);
        }));
  });

  test('resetPassword', () => {
    // Create new user and then reset password
    const newUser = createFakeUser();

    /**
     * We're not interested in the resolved value, we just wanna make sure that
     * the function resolves instead of rejecting.
     */
    return testDatabase
      .createUser(newUser)
      .then((userRow) => testDatabase.resetPassword(userRow.id));
  });

  test('comparePassword', () => {
    // Create new user
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then(async (userRow) => {
        // Check matching and unmatching passwords
        let match = await testDatabase.comparePassword(userRow.id, newUser.password);
        expect(match).toBeTruthy();

        match = await testDatabase.comparePassword(userRow.id, faker.internet.password());
        expect(match).toBeFalsy();
      });
  });

  test('makePost', () => {
    // Create new user
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then(async (userRow) => {
        // Make post
        const text = 'findPost test';
        const post = await testDatabase.makePost(userRow.id, text);

        // Check that the post was successfully made
        expect(post.text).toBe(text);
      });
  });

  test('findPost', () => {
    // Create new user
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then(async (userRow) => {
        // Make post
        const text = 'findPost test';
        const post = await testDatabase.makePost(userRow.id, text);
        const foundPost = await testDatabase.findPost(post.id);

        // Check that posts are the same
        expect(foundPost.text).toBe(post.text);
      });
  });

  test('editPost', () => {
    // Create new user
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then(async (userRow) => {
        // Make post
        const text = 'editPost test';
        const post = await testDatabase.makePost(userRow.id, text);

        // Edit post
        const editedText = 'editPost test. Edited!';
        const editedPost = await testDatabase.editPost(post.id, editedText);

        // Check that the edit was successful
        expect(editedPost.text).toBe(editedText);
      });
  });

  test('getPosts', async () => {
    // Clear all posts and users
    await testDatabase.clearAll();

    // Create new user
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then(async (userRow) => {
        // Make a couple of posts
        const text1 = 'getPosts test text1';
        const text2 = 'getPosts test text2';
        await testDatabase.makePost(userRow.id, text1);
        await testDatabase.makePost(userRow.id, text2);

        // Get posts. We use a regex to not depend on posts order
        const posts = await testDatabase.getPosts();
        expect(posts.length).toBe(2);
        expect(posts[0].text).toMatch(/getPosts test text\d/);
        expect(posts[1].text).toMatch(/getPosts test text\d/);
      });
  });

  test('deletePost', async () => {
    // Create new user
    const newUser = createFakeUser();

    return testDatabase
      .createUser(newUser)
      .then(async (userRow) => {
        // Make post
        const text = 'deletePost test';
        const post = await testDatabase.makePost(userRow.id, text);

        // Delete post. We're not interested in the return value.
        return testDatabase.deletePost(post.id);
      });
  });
});
