(function () {
  'use strict';

  try {
    var validCategories = ['sake', 'wine', 'beer', 'whisky', 'shochu'];
    var interactivePanel = document.querySelector('[data-interactive-panel]');
    var staticStories = document.querySelector('[data-static-stories]');
    var itemPanel = document.querySelector('[data-item-panel]');
    var resultCard = document.querySelector('[data-story-result]');
    var resultCategory = document.querySelector('[data-result-category]');
    var resultTitle = document.querySelector('[data-result-title]');
    var resultDescription = document.querySelector('[data-result-description]');
    var resultCatComment = document.querySelector('[data-result-cat-comment]');
    var randomButton = document.querySelector('[data-random-story]');
    var resetButton = document.querySelector('[data-reset-selection]');
    var categoryButtons = Array.prototype.slice.call(document.querySelectorAll('[data-category-choice]'));
    var itemGroups = Array.prototype.slice.call(document.querySelectorAll('[data-item-group]'));
    var itemButtons = Array.prototype.slice.call(document.querySelectorAll('[data-story-choice]'));
    var storyElements = Array.prototype.slice.call(document.querySelectorAll('[data-story-id]'));

    if (!interactivePanel || !staticStories || !itemPanel || !resultCard ||
        !resultCategory || !resultTitle || !resultDescription || !resultCatComment ||
        !randomButton || !resetButton || categoryButtons.length !== 5 ||
        itemGroups.length !== 5 || itemButtons.length !== 18 || storyElements.length !== 18) {
      return;
    }

    var stories = [];
    var storiesById = Object.create(null);
    var categoryCounts = Object.create(null);
    var categoryLabels = Object.create(null);
    var isValid = true;
    var expectedCategoryCounts = {
      sake: 3,
      wine: 6,
      beer: 3,
      whisky: 3,
      shochu: 3
    };

    validCategories.forEach(function (category) {
      categoryCounts[category] = 0;
    });

    storyElements.forEach(function (element) {
      var id = element.getAttribute('data-story-id');
      var category = element.getAttribute('data-category');
      var categoryElement = element.querySelector('.story-category');
      var titleElement = element.querySelector('.story-title');
      var descriptionElement = element.querySelector('.story-description');
      var catCommentElement = element.querySelector('.story-cat-comment');
      var categoryLabel = categoryElement ? categoryElement.textContent.trim() : '';
      var title = titleElement ? titleElement.textContent.trim() : '';
      var description = descriptionElement ? descriptionElement.textContent.trim() : '';
      var catComment = catCommentElement ? catCommentElement.textContent.trim() : '';

      if (!id || !category || validCategories.indexOf(category) === -1 ||
          storiesById[id] || !categoryLabel || !title || !description || !catComment) {
        isValid = false;
        return;
      }

      if (categoryLabels[category] && categoryLabels[category] !== categoryLabel) {
        isValid = false;
        return;
      }

      var story = {
        id: id,
        category: category,
        categoryLabel: categoryLabel,
        title: title,
        description: description,
        catComment: catComment,
        element: element
      };

      stories.push(story);
      storiesById[id] = story;
      categoryCounts[category] += 1;
      categoryLabels[category] = categoryLabel;
    });

    if (!isValid || stories.length !== 18 || validCategories.some(function (category) {
      return categoryCounts[category] !== expectedCategoryCounts[category];
    })) {
      return;
    }

    if (categoryButtons.some(function (button) {
      var category = button.getAttribute('data-category-choice');
      return validCategories.indexOf(category) === -1 || button.getAttribute('aria-pressed') !== 'false';
    }) || itemGroups.some(function (group) {
      return validCategories.indexOf(group.getAttribute('data-item-group')) === -1;
    }) || itemButtons.some(function (button) {
      var story = storiesById[button.getAttribute('data-story-choice')];
      return !story || button.getAttribute('aria-pressed') !== 'false';
    })) {
      return;
    }

    var activeCategory = null;
    var activeStoryId = null;
    var lastRandomStoryId = null;

    function setPressed(buttons, selectedValue, attributeName) {
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', button.getAttribute(attributeName) === selectedValue ? 'true' : 'false');
      });
    }

    function showCategory(category) {
      if (typeof category !== 'string' || validCategories.indexOf(category) === -1 || category === activeCategory) {
        return false;
      }

      setPressed(categoryButtons, category, 'data-category-choice');
      itemGroups.forEach(function (group) {
        group.hidden = group.getAttribute('data-item-group') !== category;
      });
      itemPanel.hidden = false;
      itemButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', 'false');
      });
      resultCard.hidden = true;
      activeCategory = category;
      activeStoryId = null;
      return true;
    }

    function showStory(storyId) {
      if (typeof storyId !== 'string' || !storiesById[storyId] || storyId === activeStoryId) {
        return false;
      }

      var story = storiesById[storyId];
      if (activeCategory !== story.category) {
        setPressed(categoryButtons, story.category, 'data-category-choice');
        itemGroups.forEach(function (group) {
          group.hidden = group.getAttribute('data-item-group') !== story.category;
        });
        itemPanel.hidden = false;
        activeCategory = story.category;
      }

      setPressed(itemButtons, story.id, 'data-story-choice');
      resultCategory.textContent = story.categoryLabel;
      resultTitle.textContent = story.title;
      resultDescription.textContent = story.description;
      resultCatComment.textContent = story.catComment;
      resultCard.hidden = false;
      activeStoryId = story.id;
      return true;
    }

    function chooseRandomStory(candidates, previousId) {
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return null;
      }
      var selectable = candidates.length > 1 ? candidates.filter(function (story) {
        return story.id !== previousId;
      }) : candidates.slice();
      if (selectable.length === 0) {
        return null;
      }
      return selectable[Math.floor(Math.random() * selectable.length)];
    }

    function resetSelection() {
      if (activeCategory === null && activeStoryId === null && itemPanel.hidden && resultCard.hidden) {
        return;
      }
      categoryButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', 'false');
      });
      itemButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', 'false');
      });
      itemGroups.forEach(function (group) {
        group.hidden = true;
      });
      itemPanel.hidden = true;
      resultCard.hidden = true;
      resultCategory.textContent = '';
      resultTitle.textContent = '';
      resultDescription.textContent = '';
      resultCatComment.textContent = '';
      activeCategory = null;
      activeStoryId = null;
    }

    categoryButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        showCategory(button.getAttribute('data-category-choice'));
      });
    });

    itemButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var storyId = button.getAttribute('data-story-choice');
        var story = typeof storyId === 'string' ? storiesById[storyId] : null;
        if (!story || story.category !== activeCategory) {
          return;
        }
        showStory(storyId);
      });
    });

    randomButton.addEventListener('click', function () {
      var category = validCategories[Math.floor(Math.random() * validCategories.length)];
      var categoryStories = stories.filter(function (story) {
        return story.category === category;
      });
      var story = chooseRandomStory(categoryStories, lastRandomStoryId);
      if (!story) {
        return;
      }
      showStory(story.id);
      lastRandomStoryId = story.id;
    });

    resetButton.addEventListener('click', resetSelection);

    interactivePanel.hidden = false;
    staticStories.hidden = true;
  } catch (error) {
    return;
  }
}());
