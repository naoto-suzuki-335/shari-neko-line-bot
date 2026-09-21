(function () {
  'use strict';

  if (!window.liff || typeof window.liff.init !== 'function') {
    return;
  }

  try {
    Promise.resolve(
      window.liff.init({
        liffId: '2011681460-ZSwLcXKw',
      })
    ).catch(function () {
      // LIFF initialization must not prevent use of the static gallery.
    });
  } catch (error) {
    // LIFF initialization must not prevent use of the static gallery.
  }
})();
