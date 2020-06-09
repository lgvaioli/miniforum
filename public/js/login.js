/* eslint-disable no-undef */
$(document).ready(() => {
  // 'Login' form submit callback
  $('#loginForm').on('submit', (event) => {
    event.preventDefault();

    const data = {
      username: $('#username').val(),
      password: $('#password').val(),
    };

    $.ajax({
      type: 'POST',
      contentType: 'application/json',
      url: BROWSER_ROUTES.LOGIN,
      data: JSON.stringify(data),
      dataType: 'json',
      success: (res) => {
        if (res.error) {
          Toast.failure(res.error);
          return;
        }

        if (res.redirect) {
          window.location.replace(res.redirect);
        }
      },
      error: (err) => {
        Toast.failure('Error: Could not log in. Check browser console for details');
        console.log(`Could not log in: ${err}`);
      },
    });
  });

  // 'Create account' form submit callback
  $('#accountForm').on('submit', (event) => {
    event.preventDefault();

    const data = {
      accountUsername: $('#accountUsername').val(),
      accountEmail: $('#accountEmail').val(),
      accountPassword: $('#accountPassword').val(),
    };

    $.ajax({
      type: 'POST',
      contentType: 'application/json',
      url: BROWSER_ROUTES.USER,
      data: JSON.stringify(data),
      dataType: 'json',
      success: (res) => {
        if (res.error) {
          Toast.failure(res.error);
          return;
        }

        if (res.redirect) {
          window.location.replace(res.redirect);
        }
      },
      error: (err) => {
        Toast.failure('Error: Could not create account. Check browser console for details');
        console.log(`Could not create account: ${err}`);
      },
    });
  });

  // 'Reset password' form submit callback
  $('#resetPasswordForm').on('submit', (event) => {
    event.preventDefault();

    const data = {
      resetPasswordUsername: $('#resetPasswordUsername').val(),
      resetPasswordEmail: $('#resetPasswordEmail').val(),
    };

    $.ajax({
      type: 'DELETE',
      contentType: 'application/json',
      url: BROWSER_ROUTES.PASSWORD,
      data: JSON.stringify(data),
      dataType: 'json',
      success: (res) => {
        if (res.error) {
          Toast.failure(res.error);
          return;
        }

        if (res.msg) {
          Toast.success(res.msg, 10000);
        }
      },
      error: (err) => {
        Toast.failure('Error: Could not reset password. Check browser console for details');
        console.log(`Could not reset password: ${err}`);
      },
    });
  });
});
