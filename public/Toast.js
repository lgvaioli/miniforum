// eslint-disable-next-line no-unused-vars
const Toast = (function toastModule() {
  const toastSettings = {
    transitionDuration: 500,
    displayLength: 2000,
  };

  // Shows a toast applying the given CSS class.
  function toastWithClass(html, toastClasses) {
  // eslint-disable-next-line no-undef
    M.toast({
      html,
      displayLength: toastSettings.displayLength,
      classes: toastClasses,
      inDuration: toastSettings.transitionDuration,
      outDuration: toastSettings.transitionDuration,
    });
  }

  // Shows a "success" toast.
  function toastSuccess(text) {
    toastWithClass(`<span data-testid="toast-success">${text}</span>`,
      'toast-generic toast-success');
  }

  // Shows a "failure" toast.
  function toastFailure(text) {
    toastWithClass(`<span data-testid="toast-failure">${text}</span>`,
      'toast-generic toast-failure');
  }

  return {
    success: toastSuccess,
    failure: toastFailure,
  };
}());
