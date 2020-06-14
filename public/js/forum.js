/* eslint-disable no-undef */
const HIDE_ANIMATION_DURATION = 300;

$(document).ready(() => {
  /**
   * Infinite scrolling globals.
   */

  // Observer options
  const observerOptions = {
    root: null, // viewport
    rootMargin: '0px',
    threshold: [0.1],
  };

  // Sentinel which triggers intersection event. It should always be the last post.
  let currentSentinel = null;

  // Id of last post
  let lastPostId = -1;

  // Observer
  let observer = null;

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
      success: (res) => {
        Toast.success(res);

        // Hide and then remove from DOM
        $(`#post_${postId}`).hide(HIDE_ANIMATION_DURATION, () => {
          $(this).remove();
        });
      },
      error: (res) => {
        Toast.failure(res.responseJSON.error);
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
      success: (res) => {
        // If update was successful the server returns the updated post
        const post = res;

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
      error: (res) => {
        Toast.failure(res.responseJSON.error);
      },
    });
  }

  /**
   * Builds an editable post widget (i.e. the textarea with a chars left counter that
   * appears when the user clicks on "Edit").
   */
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

  /**
   * Adds a post to the postBoard div.
   * @param {Object} post An object { id, username, created_on, text } with the
   * corresponding post data.
   * @param {Boolean} userOwnsPost A boolean indicating whether this user (the user logged in
   * in this browser) made this post or not. This determines whether edit/delete buttons
   * are added or not (they are added only if userOwnsPost is true).
   * @param {Boolean} prepend If true, prepends the post; otherwise, appends it.
   * @returns {Object} The DOM Element corresponding to the post's top level container.
   */
  function addPost(post, userOwnsPost, prepend) {
    const {
      id,
      username,
      // eslint-disable-next-line camelcase
      created_on,
      text,
    } = post;

    const $topLevelContainer = $('<div>');
    const $postContainer = $('<div>', {
      id: `post_${id}`,
      'data-testid': 'postContainer_test',
      class: 'post-container',
    });
    $topLevelContainer.append($postContainer);

    const $postUsername = $('<p>', { class: 'post-info' });
    $postUsername.text(`User: ${username}`);

    const $postId = $('<p>', { class: 'post-info' });
    $postId.text(`Post ID: ${id}`);

    const $createdOn = $('<p>', { id: `postDate_${id}`, class: 'post-info' });

    /**
     * FIXME: this should not be hardcoded because it's clearly dependent on the
     * user's locale/preferences.
     */
    const createdOnStr = new Date(created_on).toLocaleString('es-AR', {
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

    $postContainer.append($postUsername);
    $postContainer.append($postId);
    $postContainer.append($createdOn);
    $postContainer.append($postText);

    if (prepend) {
      $('#postBoard').prepend($topLevelContainer);
    } else {
      $('#postBoard').append($topLevelContainer);
    }

    return $topLevelContainer[0];
  }

  // GET posts from server
  function getPosts(fromId = undefined) {
    /**
     * I'm gonna explain a little why this ajax's data is not JSON like the others.
     * jQuery, for stupid spec reasons (https://stackoverflow.com/questions/10298899/how-to-send-data-in-request-body-with-a-get-when-using-jquery-ajax),
     * does *not* send data as JSON if the type of request is GET. It doesn't matter if
     * you say "contentType: 'application/json'" and then pass JSON.stringified data in
     * 'data': jQuery will IGNORE that shit and just send your data as query params (i.e.
     * http://someurl?param1=value1&param2=value2...). This caused me headaches because
     * I was expecting data to be in the request body from the server-side. After
     * debugging this for a while (thank God for Chrome's devtools!), I said 'fuck it'
     * and just changed the server-side code to expect query params.
     * Given that jQuery isn't actually sending JSON, I felt it was more appropriate to
     * reflect that fact explicitly and using the default 'application/x-www-form-urlencoded'
     * type with a plain old 'param=value' data.
     */
    $.ajax({
      type: 'GET',
      url: BROWSER_ROUTES.POST,
      data: fromId ? `fromId=${fromId}` : '',
      dataType: 'json',
      success: (res) => {
        // If no posts were returned, just return
        if (res.posts.length === 0) {
          return;
        }

        let lastPost;

        for (let i = 0; i < res.posts.length; i += 1) {
          lastPost = addPost(res.posts[i], res.posts[i].user_id === res.userId, false);
        }

        // Update last post id
        lastPostId = res.posts[res.posts.length - 1].id;

        // Unobserve currentSentinel, if any
        if (currentSentinel) {
          observer.unobserve(currentSentinel);
        }

        // Update currentSentinel and observe it
        currentSentinel = lastPost;
        observer.observe(currentSentinel);
      },
      error: (res) => {
        Toast.failure(res.responseJSON.error);
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
      success: (res) => {
        const post = {
          id: res.post.id,
          created_on: res.post.created_on,
          text: res.post.text,
          username: res.username,
        };

        addPost(post, true, true);

        /**
         * Clear input. We also trigger the input event to update the chars
         * left counter; otherwise it gets stuck at the last value, which is just ugly.
         */
        $('#userInput')
          .val('')
          .trigger('input');

        Toast.success(`Successfully posted! Post #${post.id}`);
      },
      error: (res) => {
        Toast.failure(res.responseJSON.error);
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

  // Change password button
  $('#changePassword-btn').on('click', () => {
    window.location.replace(BROWSER_ROUTES.PASSWORD);
  });

  // Set up intersection observer
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      getPosts(lastPostId);
    }
  }, observerOptions);

  // Get initial post batch
  getPosts();
});
