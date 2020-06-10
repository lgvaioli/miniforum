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
        if (res.redirect) {
          Toast.success('Password changed! Gonna redirect you so you can log back in', 4000);
          setTimeout(() => {
            window.location.replace(res.redirect);
          }, 5000);
        }
      },
      error: (res) => {
        Toast.failure(res.responseJSON.error);
      },
    });
  });
});
