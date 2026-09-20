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
  let lastRandomVideoHref = null;

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
        return;
      }

      showCategory(button.dataset.category);
      clearRandomVideo();
    });
  });

  if (randomVideoButton) {
    randomVideoButton.addEventListener('click', showRandomVideo);
  }

  showCategory('all');
})();
