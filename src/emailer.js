"use strict";

require('dotenv').config();
const sgMail = require('@sendgrid/mail');

function setupEmailer() {
    if(process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
}

function sendNewPassword(userEmail, newPassword) {
    if(process.env.SENDGRID_API_KEY) {
        return new Promise((resolve, reject) => {
            const msg = {
                to: userEmail,
                from: {email: process.env.EMAILER_VALIDATED_EMAIL,
                        name: process.env.EMAILER_NAME},
                subject: 'Password Recovery',
                text: `Here is your new password: ${newPassword}`,
              };
              
              sgMail.send(msg)
                  .then(() => {
                      resolve("Email successfully sent");
                  })
                  .catch((err) => {
                      reject(err.response.body);
                  });
        });
    } else {
        return Promise.reject("Emailer service not available!");
    }    
}

const _Emailer = {
    sendNewPassword: sendNewPassword,
};

exports.setupEmailer    = setupEmailer;
exports.Emailer         = _Emailer;
