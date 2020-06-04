/* eslint-disable no-undef */
$(document).ready(() => {
  $('#gobackBtn').on('click', () => {
    window.location.replace(BROWSER_ROUTES.FORUM);
  });

  $('#changePasswordBtn').on('click', () => {
    const data = {
      currentPassword: $('#currentPassword').val(),
      newPassword: $('#newPassword').val(),
      newPasswordAgain: $('#newPasswordAgain').val(),
    };

    $.ajax({
      type: 'PUT',
      contentType: 'application/json',
      url: BROWSER_ROUTES.PASSWORD,
      data: JSON.stringify(data),
      dataType: 'json',
      success: (res) => {
        if (res.error) {
          Toast.failure(res.error);
          return;
        }

        if (res.redirect) {
          window.location.replace(res.redirect);

          // FIXME: display flash success here
        }
      },
      error: (err) => {
        Toast.failure(err);
      },
    });
  });
});
