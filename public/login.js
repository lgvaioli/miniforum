/* eslint-disable no-undef */
$(document).ready(() => {
  // 'Login' button callback
  $('#loginBtn').on('click', () => {
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
        Toast.failure(err);
      },
    });
  });

  // 'Create account' button callback
  $('#createAccountBtn').on('click', () => {
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
        Toast.failure(err);
      },
    });
  });

  // 'Reset password' button callback
  $('#resetPasswordBtn').on('click', () => {
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
        Toast.failure(err);
      },
    });
  });
});
