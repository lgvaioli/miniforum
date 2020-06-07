const sgMail = require('@sendgrid/mail');
const { EMAILER_VALIDATED_EMAIL, EMAILER_NAME } = require('./globals');

let emailer = null;

function sendNewPassword(userEmail, newPassword) {
  return new Promise((resolve, reject) => {
    const msg = {
      to: userEmail,
      from: {
        email: EMAILER_VALIDATED_EMAIL,
        name: EMAILER_NAME,
      },
      subject: 'Password Reset',
      text: `Here is your new password: ${newPassword}`,
    };

    sgMail.send(msg)
      .then(() => {
        resolve('Email sent');
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
