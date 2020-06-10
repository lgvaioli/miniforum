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
        if (res.redirect) {
          window.location.replace(res.redirect);
        }
      },
      error: (res) => {
        Toast.failure(res.responseJSON.error);
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
        if (res.redirect) {
          window.location.replace(res.redirect);
        }
      },
      error: (res) => {
        Toast.failure(res.responseJSON.error);
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
        if (res.msg) {
          Toast.success(res.msg, 10000);
        }
      },
      error: (res) => {
        Toast.failure(res.responseJSON.error);
      },
    });
  });
});
