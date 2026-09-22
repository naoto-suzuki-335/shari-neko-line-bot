(function () {
  'use strict';

  var statusElement = document.querySelector('[data-liff-status]');
  if (!statusElement || !window.liff || typeof window.liff.init !== 'function') {
    return;
  }

  var initialization;
  try {
    initialization = window.liff.init({
      liffId: '2011681460-aIUYxlvf'
    });
  } catch (error) {
    return;
  }

  Promise.resolve(initialization).then(function () {
    var isInClient;
    try {
      if (typeof window.liff.isInClient !== 'function') {
        return;
      }
      isInClient = window.liff.isInClient();
    } catch (error) {
      return;
    }

    statusElement.textContent = isInClient ? 'LINE内で表示中' : 'ブラウザで表示中';
    statusElement.hidden = false;
  }, function () {
    return;
  });
}());
