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
    ).then(function () {
      var status = document.getElementById('liff-status');

      if (!status) {
        return;
      }

      status.textContent = window.liff.isInClient()
        ? 'LINE内で表示中'
        : 'ブラウザで表示中';
      status.hidden = false;
    }).catch(function () {
      // LIFF initialization must not prevent use of the static gallery.
    });
  } catch (error) {
    // LIFF initialization must not prevent use of the static gallery.
  }
})();
