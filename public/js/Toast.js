// eslint-disable-next-line no-unused-vars
const Toast = (function toastModule() {
  const toastSettings = {
    transitionDuration: 500,
    displayLength: 2000,
  };

  // Shows a toast applying the given CSS class.
  function toastWithClass(html, toastClasses, length) {
  // eslint-disable-next-line no-undef
    M.toast({
      html,
      displayLength: length,
      classes: toastClasses,
      inDuration: toastSettings.transitionDuration,
      outDuration: toastSettings.transitionDuration,
    });
  }

  // Shows a "success" toast.
  function toastSuccess(text, length = toastSettings.displayLength) {
    toastWithClass(`<span data-testid="toast-success">${text}</span>`,
      'toast-generic toast-success', length);
  }

  // Shows a "failure" toast.
  function toastFailure(text, length = toastSettings.displayLength) {
    toastWithClass(`<span data-testid="toast-failure">${text}</span>`,
      'toast-generic toast-failure', length);
  }

  return {
    success: toastSuccess,
    failure: toastFailure,
  };
}());
