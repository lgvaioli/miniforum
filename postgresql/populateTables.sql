/* Create some users */
INSERT INTO users (username, password, email)
VALUES ('John', 'imjohn123', 'john@johnsburg.com');

INSERT INTO users (username, password, email)
VALUES ('Pedro', 'pedroasf123', 'pedro@someaddress.com');

INSERT INTO users (username, password, email)
VALUES ('Marie', 'marieasdfgh123', 'marie@myemailaddress.com');

INSERT INTO users (username, password, email)
VALUES ('test_validusername', 'test_validusername', 'test_validusername@test.com');

/* Create some posts */
INSERT INTO posts (user_id, text)
VALUES ((SELECT users.id FROM users WHERE users.username = 'John'), 'Hi, my name is John!');

INSERT INTO posts (user_id, text)
VALUES ((SELECT users.id FROM users WHERE users.username = 'Pedro'), 'Hola che, me llamo Pedro!');

INSERT INTO posts (user_id, text)
VALUES ((SELECT users.id FROM users WHERE users.username = 'Marie'), 'Salut, je m''appelle Marie !');
