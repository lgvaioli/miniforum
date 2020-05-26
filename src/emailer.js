require('dotenv').config();
const sgMail = require('@sendgrid/mail');

let emailer = null;

function sendNewPassword(userEmail, newPassword) {
  return new Promise((resolve, reject) => {
    const msg = {
      to: userEmail,
      from: {
        email: process.env.EMAILER_VALIDATED_EMAIL,
        name: process.env.EMAILER_NAME,
      },
      subject: 'Password Reset',
      text: `Here is your new password: ${newPassword}`,
    };

    sgMail.send(msg)
      .then(() => {
        resolve('Email successfully sent');
      })
      .catch((err) => {
        reject(err.response.body);
      });
  });
}

function getEmailer(sendgridApiKey) {
  if (!emailer) {
    sgMail.setApiKey(sendgridApiKey);

    emailer = {
      sendNewPassword,
    };
  }

  return emailer;
}

exports.getEmailer = getEmailer;
