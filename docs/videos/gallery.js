(function () {
  'use strict';

  const categoryButtons = Array.from(
    document.querySelectorAll('[data-category]')
  );
  const categorySections = Array.from(
    document.querySelectorAll('[data-gallery-category]')
  );
  const galleryStatus = document.getElementById('gallery-status');
  const randomVideoButton = document.getElementById('random-video-button');
  const randomVideoResult = document.getElementById('random-video-result');
  const randomVideoName = document.getElementById('random-video-name');
  const randomVideoLink = document.getElementById('random-video-link');
  const categoryNames = Object.freeze({
    all: 'すべて',
    outing: 'おでかけ',
    daily: '日常',
    seasonal: '季節',
    autumn: '秋',
    work: 'おしごと',
  });
  let lastRandomVideoHref = null;

  if (!categoryButtons.length || !categorySections.length || !galleryStatus) {
    return;
  }

  function showCategory(category) {
    const isKnownCategory = Object.prototype.hasOwnProperty.call(
      categoryNames,
      category
    );

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
      categoryNames[category] + '・' + visibleCount + '作品を表示中';
  }

  function getInitialCategory() {
    try {
      if (typeof window.URLSearchParams !== 'function') {
        return 'all';
      }

      const parameters = new window.URLSearchParams(window.location.search);
      const categories = parameters.getAll('category');

      if (
        categories.length !== 1 ||
        !Object.prototype.hasOwnProperty.call(categoryNames, categories[0])
      ) {
        return 'all';
      }

      return categories[0];
    } catch (error) {
      return 'all';
    }
  }

  function replaceCategoryInUrl(category) {
    try {
      if (
        !window.history ||
        typeof window.history.replaceState !== 'function' ||
        typeof window.URL !== 'function' ||
        typeof window.URLSearchParams !== 'function'
      ) {
        return;
      }

      const url = new window.URL(window.location.href);
      const parameters = new window.URLSearchParams(url.search);

      if (category === 'all') {
        parameters.delete('category');
      } else {
        parameters.set('category', category);
      }

      url.search = parameters.toString();
      window.history.replaceState(null, '', url.href);
    } catch (error) {
      // URL updates must not prevent category switching.
    }
  }

  function clearRandomVideo() {
    if (!randomVideoResult || !randomVideoName || !randomVideoLink) {
      return;
    }

    randomVideoName.textContent = '';
    randomVideoLink.removeAttribute('href');
    randomVideoResult.hidden = true;
  }

  function getVisibleVideoCards() {
    return categorySections.reduce(function (cards, section) {
      if (!section.hidden) {
        return cards.concat(Array.from(section.querySelectorAll('.card-link')));
      }

      return cards;
    }, []);
  }

  function showRandomVideo() {
    if (!randomVideoResult || !randomVideoName || !randomVideoLink) {
      return;
    }

    const cards = getVisibleVideoCards();
    const selectableCards =
      cards.length > 1
        ? cards.filter(function (card) {
            return card.getAttribute('href') !== lastRandomVideoHref;
          })
        : cards;

    if (!selectableCards.length) {
      return;
    }

    const selectedCard =
      selectableCards[Math.floor(Math.random() * selectableCards.length)];
    const selectedName = selectedCard.querySelector('.label');
    const selectedHref = selectedCard.getAttribute('href');

    if (!selectedName || !selectedHref) {
      return;
    }

    randomVideoName.textContent = selectedName.textContent;
    randomVideoLink.setAttribute('href', selectedHref);
    randomVideoResult.hidden = false;
    lastRandomVideoHref = selectedHref;
  }

  categoryButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.getAttribute('aria-pressed') === 'true') {
        if (button.dataset.category === 'all') {
          replaceCategoryInUrl('all');
        }

        return;
      }

      showCategory(button.dataset.category);
      clearRandomVideo();
      replaceCategoryInUrl(button.dataset.category);
    });
  });

  if (randomVideoButton) {
    randomVideoButton.addEventListener('click', showRandomVideo);
  }

  showCategory(getInitialCategory());
})();
