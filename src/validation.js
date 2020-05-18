// Checks for a valid username with the following rules:
//  - Only the characters [a-zA-Z], [0-9], _ (underscore) and - (dash) are allowed.
//  - Minimum length of 1 character.
//  - Maximum length of 20 characters.
// Returns true if the username is valid; false otherwise.
function isValidUsername(username) {
    const regexp = /^[a-zA-Z0-9\_\-]{1,20}$/;
    return regexp.test(username);
}

// Checks for a valid username with the follwoing rules:
// - Only the characters [a-zA-Z], [0-9], _ (underscore), - (dash), @ (at), and . (dot) are allowed.
// - Minimum length of 10 characters.
// - Maximum length of 255 characters.
// - Contains at least one '@' character.
// Returns true if the username is valid; false otherwise.
function isValidEmail(email) {
    if(!email.includes("@")) {
        return false;
    }

    const regexp = /^[a-zA-Z0-9\_\-@\.]{10,255}$/;
    return regexp.test(email);
}

// Checks for a valid password with the following rules:
//  - Password must be at least 6 characters long.
// Returns true if the password is valid; false otherwise.
function isValidPassword(password) {
    return password.length >= 6;
}

// Checks for a valid comment with the following rules:
//  - Comment can't be entirely made up of whitespace.
//  - Comment must be at most 255 characters long.
// Returns true if the comment is valid; false otherwise.
function isValidComment(comment) {
    if(comment.length > 255) {
        return false;
    }

    noWhitespace = comment.replace(/\s/g, "");

    return noWhitespace.length > 0;
}

exports.isValidUsername = isValidUsername;
exports.isValidEmail    = isValidEmail;
exports.isValidPassword = isValidPassword;
exports.isValidComment  = isValidComment;
