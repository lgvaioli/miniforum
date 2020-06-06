/* eslint-disable no-undef */
const HIDE_ANIMATION_DURATION = 300;

$(document).ready(() => {
  // Set default input counter value, from global variable
  $('#input-counter').text(POST_MAXLENGTH);

  function deleteButtonCallback(event) {
    const postId = event.data;

    $.ajax({
      type: 'DELETE',
      contentType: 'application/json',
      url: BROWSER_ROUTES.POST,
      data: JSON.stringify({ postId }),
      dataType: 'json',
      success: (serverResponse) => {
        // FIXME: this is kinda ugly and we can probably fix it easily by just
        // NOT returning a 200 (OK) code from the server when something is... not ok.
        if (serverResponse.error) {
          Toast.failure(serverResponse.error);
          return;
        }

        Toast.success(serverResponse);

        // Hide and then remove from DOM
        $(`#post_${postId}`).hide(HIDE_ANIMATION_DURATION, () => {
          $(this).remove();
        });

        // Delete (remove from DOM) post from postBoard
        // $("#post_" + postId).remove();
      },
      error: (err) => {
        Toast.failure('Error: Could not delete post. Check browser console for details');
        console.log(`Could not delete post: ${JSON.stringify(err)}`);
      },
    });
  }

  function postEditButtonCallback(event) {
    event.preventDefault();
    const postId = event.data;
    const editText = $(`#editable_textarea_${postId}`).val();

    $.ajax({
      type: 'PUT',
      contentType: 'application/json',
      url: BROWSER_ROUTES.POST,
      data: JSON.stringify({ postId, editText }),
      dataType: 'json',
      success: (data) => {
        if (data.error) {
          Toast.failure(data.error);
          return;
        }

        // If update was successful the server returns the updated post
        const post = data;

        // Update post text
        $(`#postText_${postId}`).text(editText);

        // Update post date
        const newDateStr = new Date(post.created_on).toLocaleString('es-AR');
        $(`#postDate_${postId}`).text(newDateStr);

        // Toggle post and editable post
        $(`#post_${postId}`).toggle();
        $(`#editable_${postId}`).toggle();

        Toast.success(`Updated post #${postId}!`);
      },
      error: (err) => {
        Toast.failure('Error: Could not edit post. Check browser console for details');
        console.log(`Error: ${JSON.stringify(err)}`);
      },
    });
  }

  // Builds an editable post widget (i.e. the textarea with a chars left counter that
  // appears when the user clicks on "Edit").
  function buildEditablePostWidget(postId, postText, $postContainer) {
    const $form = $('<div>', { id: `editable_${postId}`, class: 'post-editable' });
    $form.css('display', 'none');
    const $counterContainer = $('<p>', { class: 'counter-container' });
    const $inputCounter = $('<span>', { id: `inputCounter_${postId}` });
    $counterContainer.append($inputCounter);
    $counterContainer.append(' characters left');

    const $textarea = $('<textarea>', {
      id: `editable_textarea_${postId}`,
      'data-testid': 'editable_textarea_test',
    });
    $textarea.val(postText);
    $textarea.attr('maxlength', POST_MAXLENGTH);
    $textarea.on('input', () => {
      const charsLeft = POST_MAXLENGTH - $textarea.val().length;
      $inputCounter.text(charsLeft);
    });

    $inputCounter.text(POST_MAXLENGTH - $textarea.val().length);

    const $cancelBtn = $('<button>', { class: 'btn cancel-btn' });
    $cancelBtn.text('Cancel');
    $cancelBtn.on('click', () => {
      $form.toggle();
      $postContainer.toggle();
    });

    const $postEditBtn = $('<button>', { class: 'btn', 'data-testid': 'postEditBtn' });
    $postEditBtn.text('Post edit');
    $postEditBtn.on('click', postId, postEditButtonCallback);

    $form.append($counterContainer);
    $form.append($textarea);
    $form.append('<br>');
    $form.append($cancelBtn);
    $form.append($postEditBtn);

    return $form;
  }

  // Adds a post to the postBoard div. If prepend is true, adds it to the beginning
  // of the postBoard div (i.e. prepends it); otherwise, adds it to the end (i.e appends it).
  // If userOwnsPost is true, "Edit" and "Delete" buttons are added.
  function addPost(id, username, createdOn, text, userOwnsPost, prepend) {
    const $topLevelContainer = $('<div>');
    const $postContainer = $('<div>', {
      id: `post_${id}`,
      'data-testid': 'postContainer_test',
      class: 'post-container',
    });
    $topLevelContainer.append($postContainer);

    const $userImage = $('<img>', { src: '/user.jpg', class: 'post-userImage' });

    const $postUsername = $('<p>', { class: 'post-info' });
    $postUsername.text(`User: ${username}`);

    const $postId = $('<p>', { class: 'post-info' });
    $postId.text(`Post ID: ${id}`);

    const $createdOn = $('<p>', { id: `postDate_${id}`, class: 'post-info' });

    /**
     * FIXME: this should not be hardcoded because it's clearly dependent on the
     * user's locale/preferences.
     */
    const createdOnStr = new Date(createdOn).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    $createdOn.text(`${createdOnStr} hs`);

    const $postText = $('<p>', {
      id: `postText_${id}`,
      class: 'post-text',
      'data-testid': 'postText_test',
    });
    $postText.text(text);

    // Append delete and edit buttons if necessary
    if (userOwnsPost) {
      const $editable = buildEditablePostWidget(id, text, $postContainer);
      $topLevelContainer.append($editable);

      const $deleteBtn = $('<button>', {
        id: `deleteBtn_${id}`,
        class: 'btn post-btn',
        'data-testid': 'deleteBtn_test',
      });
      $deleteBtn.text('Delete');
      $deleteBtn.on('click', id, deleteButtonCallback);

      const $editBtn = $('<button>', {
        id: `editBtn_${id}`,
        class: 'btn post-btn',
        'data-testid': 'editBtn_test',
      });
      $editBtn.text('Edit');
      $editBtn.on('click', () => {
        $editable.toggle();
        $postContainer.toggle();
      });

      $postContainer.append($deleteBtn);
      $postContainer.append($editBtn);
    }

    $postContainer.append($userImage);
    $postContainer.append($postUsername);
    $postContainer.append($postId);
    $postContainer.append($createdOn);
    $postContainer.append($postText);

    if (prepend) {
      $('#postBoard').prepend($topLevelContainer);
    } else {
      $('#postBoard').append($topLevelContainer);
    }
  }

  // GET posts from server
  function getPosts() {
    $.ajax({
      type: 'GET',
      url: BROWSER_ROUTES.POST,
      dataType: 'json',
      success: (data) => {
        if (data.error) {
          Toast.failure(JSON.stringify(data));
          return;
        }

        data.posts.forEach((post) => {
          const userOwnsPost = post.user_id === data.userId;
          addPost(post.id, post.username, post.created_on, post.text,
            userOwnsPost, false);
        });
      },
      error: (err) => {
        Toast.failure(JSON.stringify(err));
      },
    });
  }

  // Make a new post callback
  $('#myForm').submit((event) => {
    // We're gonna submit manually with jQuery
    event.preventDefault();

    // Check input
    const userInput = $('#userInput').val();

    if (userInput === '') {
      Toast.failure("You can't post an empty message");
      return;
    }

    $.ajax({
      type: 'POST',
      contentType: 'application/json',
      url: BROWSER_ROUTES.POST,
      data: JSON.stringify({ userInput }),
      dataType: 'json',
      success: (data) => {
        if (data.error) {
          Toast.failure(data.error);
          return;
        }

        const { post } = data;
        addPost(post.id, data.username, post.created_on, post.text, true, true);

        // Clear input. We also trigger the input event to update the chars
        // left counter; otherwise it gets stuck at the last value, which is
        // just ugly.
        $('#userInput')
          .val('')
          .trigger('input');

        Toast.success(`Successfuly posted! Post #${post.id}`);
      },
      error: (err) => {
        console.log(`Error: ${JSON.stringify(err)}`);
      },
    });
  });

  // User input counter
  $('#userInput')
    .attr('maxlength', POST_MAXLENGTH)
    .on('input', () => {
      const charsLeft = POST_MAXLENGTH - $('#userInput').val().length;
      $('#input-counter').text(charsLeft);
    });

  // Logout button
  $('#logout-btn').on('click', () => {
    $.ajax({
      type: 'GET',
      url: BROWSER_ROUTES.LOGOUT,
      dataType: 'json',
      success: (data) => {
        if (data.redirect) {
          window.location.replace(data.redirect);
        }
      },
      error: (err) => {
        Toast.failure(`Logout error: ${JSON.stringify(err)}`);
      },
    });
  });

  // Change password button
  $('#changePassword-btn').on('click', () => {
    window.location.replace(BROWSER_ROUTES.PASSWORD);
  });

  getPosts();
});
