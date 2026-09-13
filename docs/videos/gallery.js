(function () {
  'use strict';

  const categoryButtons = Array.from(
    document.querySelectorAll('[data-category]')
  );
  const categorySections = Array.from(
    document.querySelectorAll('[data-gallery-category]')
  );
  const galleryStatus = document.getElementById('gallery-status');

  if (!categoryButtons.length || !categorySections.length || !galleryStatus) {
    return;
  }

  function showCategory(category) {
    const isKnownCategory =
      category === 'all' ||
      categorySections.some(function (section) {
        return section.dataset.galleryCategory === category;
      });

    if (!isKnownCategory) {
      return;
    }

    let visibleCount = 0;

    categorySections.forEach(function (section) {
      const isVisible =
        category === 'all' || section.dataset.galleryCategory === category;
      section.hidden = !isVisible;

      if (isVisible) {
        visibleCount += section.querySelectorAll('.card-link').length;
      }
    });

    categoryButtons.forEach(function (button) {
      button.setAttribute(
        'aria-pressed',
        button.dataset.category === category ? 'true' : 'false'
      );
    });

    galleryStatus.textContent =
      category === 'all'
        ? '全' + visibleCount + '作品を表示中'
        : visibleCount + '作品を表示中';
  }

  categoryButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.getAttribute('aria-pressed') === 'true') {
        return;
      }

      showCategory(button.dataset.category);
    });
  });

  showCategory('all');
})();
