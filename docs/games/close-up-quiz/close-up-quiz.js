(() => {
  "use strict";

  const works = Object.freeze([
    { label: "バリスタ", slug: "barista-neko", category: "おでかけ", thumbnailUrl: "../../assets/images/barista-neko-thumbnail.jpg", pageUrl: "../../videos/barista-neko/", cropPosition: "50% 46%" },
    { label: "レコード", slug: "record-shop-neko", category: "おでかけ", thumbnailUrl: "../../assets/images/record-shop-neko-thumbnail.jpg", pageUrl: "../../videos/record-shop-neko/", cropPosition: "55% 50%" },
    { label: "UFOキャッチャー", slug: "ufo-catcher-neko", category: "おでかけ", thumbnailUrl: "../../assets/images/ufo-catcher-neko-thumbnail.jpg", pageUrl: "../../videos/ufo-catcher-neko/", cropPosition: "60% 58%" },
    { label: "海辺", slug: "seaside-neko", category: "日常", thumbnailUrl: "../../assets/images/seaside-neko-thumbnail.jpg", pageUrl: "../../videos/seaside-neko/", cropPosition: "70% 48%" },
    { label: "角ロック", slug: "kaku-rock-neko", category: "日常", thumbnailUrl: "../../assets/images/kaku-rock-neko-thumbnail.jpg", pageUrl: "../../videos/kaku-rock-neko/", cropPosition: "55% 60%" },
    { label: "ナウなヤング", slug: "now-na-young-neko", category: "日常", thumbnailUrl: "../../assets/images/now-na-young-neko-thumbnail.jpg", pageUrl: "../../videos/now-na-young-neko/", cropPosition: "50% 50%" },
    { label: "てるてる坊主", slug: "teru-teru-bozu-neko", category: "季節", thumbnailUrl: "../../assets/images/teru-teru-bozu-neko-thumbnail.jpg", pageUrl: "../../videos/teru-teru-bozu-neko/", cropPosition: "50% 50%" },
    { label: "シュノーケリング", slug: "snorkeling-neko", category: "季節", thumbnailUrl: "../../assets/images/snorkeling-neko-thumbnail.jpg", pageUrl: "../../videos/snorkeling-neko/", cropPosition: "50% 55%" },
    { label: "おいも掘り", slug: "sweet-potato-digging-neko", category: "秋", thumbnailUrl: "../../assets/images/sweet-potato-digging-neko-thumbnail.jpg", pageUrl: "../../videos/sweet-potato-digging-neko/", cropPosition: "42% 55%" },
    { label: "焼き芋", slug: "roasted-sweet-potato-neko", category: "秋", thumbnailUrl: "../../assets/images/roasted-sweet-potato-neko-thumbnail.jpg", pageUrl: "../../videos/roasted-sweet-potato-neko/", cropPosition: "50% 54%" },
    { label: "陶芸家", slug: "pottery-artist-neko", category: "おしごと", thumbnailUrl: "../../assets/images/pottery-artist-neko-thumbnail.jpg", pageUrl: "../../videos/pottery-artist-neko/", cropPosition: "72% 52%" },
    { label: "寿司職人", slug: "sushi-chef-neko", category: "おしごと", thumbnailUrl: "../../assets/images/sushi-chef-neko-thumbnail.jpg", pageUrl: "../../videos/sushi-chef-neko/", cropPosition: "60% 60%" }
  ]);

  const statusElement = document.querySelector("[data-close-up-status]");
  const frameElement = document.querySelector("[data-close-up-frame]");
  const imageElement = document.querySelector("[data-close-up-image]");
  const choicesElement = document.querySelector("[data-close-up-choices]");
  const resultElement = document.querySelector("[data-close-up-result]");
  const resultHeadingElement = document.querySelector("[data-close-up-result-heading]");
  const resultMessageElement = document.querySelector("[data-close-up-result-message]");
  const answerNameElement = document.querySelector("[data-close-up-answer-name]");
  const videoLinkElement = document.querySelector("[data-close-up-video-link]");
  const nextButtonElement = document.querySelector("[data-close-up-next]");
  const errorElement = document.querySelector("[data-close-up-error]");
  const retryButtonElement = document.querySelector("[data-close-up-retry]");
  const gameContainerElement = document.querySelector(".game-panel");

  const requiredElements = [
    statusElement,
    frameElement,
    imageElement,
    choicesElement,
    resultElement,
    resultHeadingElement,
    resultMessageElement,
    answerNameElement,
    videoLinkElement,
    nextButtonElement,
    errorElement,
    retryButtonElement,
    gameContainerElement
  ];

  let currentQuestion = null;
  let previousCorrectSlug = null;
  let generation = 0;
  let isAnswered = false;
  let isImageReady = false;
  let isQuestionLoading = false;
  let activeImageLoader = null;

  function validateWorks(items) {
    if (!Array.isArray(items) || items.length < 3) {
      return "クイズの候補が足りません。";
    }

    const slugs = new Set();
    const labels = new Set();
    const requiredKeys = ["label", "slug", "category", "thumbnailUrl", "pageUrl", "cropPosition"];

    for (const item of items) {
      if (!item || requiredKeys.some((key) => typeof item[key] !== "string" || item[key].trim() === "")) {
        return "クイズの候補データを確認できませんでした。";
      }
      if (slugs.has(item.slug) || labels.has(item.label)) {
        return "クイズの候補に重複があります。";
      }
      slugs.add(item.slug);
      labels.add(item.label);
    }

    return "";
  }

  function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  function setChoicesDisabled(disabled) {
    choicesElement.querySelectorAll("button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function cancelActiveImageLoader() {
    if (!activeImageLoader) {
      return;
    }
    activeImageLoader.onload = null;
    activeImageLoader.onerror = null;
    activeImageLoader = null;
  }

  function resetQuestionControls() {
    nextButtonElement.disabled = true;
    retryButtonElement.disabled = true;
    retryButtonElement.hidden = true;
  }

  function showInitializationFailure() {
    const message = "クイズを開始できませんでした。";

    if (choicesElement) {
      choicesElement.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });
      choicesElement.replaceChildren();
    }
    if (nextButtonElement) {
      nextButtonElement.disabled = true;
      nextButtonElement.hidden = true;
    }
    if (retryButtonElement) {
      retryButtonElement.disabled = true;
      retryButtonElement.hidden = true;
    }
    if (videoLinkElement) {
      videoLinkElement.removeAttribute("href");
      videoLinkElement.hidden = true;
    }
    if (imageElement) {
      imageElement.classList.remove("is-zoomed");
      imageElement.removeAttribute("src");
      imageElement.alt = "問題画像を表示できませんでした。";
    }
    if (resultElement) {
      resultElement.hidden = true;
    }

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
      return;
    }
    if (statusElement) {
      statusElement.textContent = message;
      return;
    }
    if (resultMessageElement) {
      resultMessageElement.textContent = message;
      if (resultElement) {
        resultElement.hidden = false;
      }
      return;
    }

    const fallbackId = "close-up-quiz-initialization-error";
    let fallbackElement = document.querySelector(`#${fallbackId}`);
    if (!fallbackElement) {
      const fallbackParent = gameContainerElement || document.querySelector("main") || document.body;
      if (!fallbackParent) {
        return;
      }
      fallbackElement = document.createElement("p");
      fallbackElement.id = fallbackId;
      fallbackElement.setAttribute("role", "alert");
      fallbackParent.append(fallbackElement);
    }
    fallbackElement.textContent = message;
  }

  function stopGame(message) {
    generation += 1;
    cancelActiveImageLoader();
    currentQuestion = null;
    isAnswered = true;
    isImageReady = false;
    isQuestionLoading = false;
    resetQuestionControls();
    frameElement.setAttribute("aria-busy", "false");
    choicesElement.replaceChildren();
    resultElement.hidden = true;
    errorElement.textContent = message;
    errorElement.hidden = false;
    statusElement.textContent = "クイズを開始できませんでした。";
    imageElement.classList.remove("is-zoomed");
    imageElement.removeAttribute("src");
    imageElement.alt = "問題画像を表示できませんでした。";
  }

  function showImageLoadError(message, questionGeneration, loader) {
    if (questionGeneration !== generation || activeImageLoader !== loader) {
      return;
    }

    cancelActiveImageLoader();
    currentQuestion = null;
    isAnswered = true;
    isImageReady = false;
    isQuestionLoading = false;
    frameElement.setAttribute("aria-busy", "false");
    setChoicesDisabled(true);
    choicesElement.replaceChildren();
    resultElement.hidden = true;
    videoLinkElement.removeAttribute("href");
    nextButtonElement.disabled = true;
    retryButtonElement.hidden = false;
    retryButtonElement.disabled = false;
    errorElement.textContent = message;
    errorElement.hidden = false;
    statusElement.textContent = "問題画像を読み込めませんでした。";
    imageElement.classList.remove("is-zoomed");
    imageElement.removeAttribute("src");
    imageElement.alt = "問題画像を表示できませんでした。";
    retryButtonElement.focus({ preventScroll: false });
  }

  function chooseQuestion() {
    const eligibleWorks = works.filter((work) => work.slug !== previousCorrectSlug);
    if (eligibleWorks.length === 0) {
      stopGame("次の問題を用意できませんでした。");
      return null;
    }

    const correct = eligibleWorks[Math.floor(Math.random() * eligibleWorks.length)];
    const incorrectPool = works.filter((work) => work.slug !== correct.slug);
    if (incorrectPool.length < 2) {
      stopGame("3つの選択肢を用意できませんでした。");
      return null;
    }

    const choices = shuffle([correct, ...shuffle(incorrectPool).slice(0, 2)]);
    if (new Set(choices.map((choice) => choice.slug)).size !== 3) {
      stopGame("選択肢を正しく用意できませんでした。");
      return null;
    }

    return { correct, choices };
  }

  function renderChoices(question, questionGeneration) {
    const fragment = document.createDocumentFragment();
    question.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice.label;
      button.dataset.slug = choice.slug;
      button.disabled = true;
      button.addEventListener("click", () => answerQuestion(choice.slug, questionGeneration));
      fragment.append(button);
    });
    choicesElement.replaceChildren(fragment);
  }

  function loadQuestionImage(question, questionGeneration) {
    cancelActiveImageLoader();
    const loader = new Image();
    activeImageLoader = loader;

    loader.onload = () => {
      if (questionGeneration !== generation || activeImageLoader !== loader) {
        return;
      }
      if (loader.naturalWidth <= 0) {
        showImageLoadError("問題画像を読み込めませんでした。もう一度お試しください。", questionGeneration, loader);
        return;
      }

      cancelActiveImageLoader();
      if (currentQuestion !== question) {
        return;
      }
      imageElement.src = question.correct.thumbnailUrl;
      isQuestionLoading = false;
      isImageReady = true;
      frameElement.setAttribute("aria-busy", "false");
      statusElement.textContent = "このしゃりねこは、どの動画でしょう？";
      setChoicesDisabled(false);
      const firstChoice = choicesElement.querySelector("button");
      if (firstChoice) {
        firstChoice.focus({ preventScroll: true });
      }
    };

    loader.onerror = () => {
      showImageLoadError("問題画像を読み込めませんでした。もう一度お試しください。", questionGeneration, loader);
    };

    loader.src = question.correct.thumbnailUrl;
  }

  function showQuestion() {
    if (isQuestionLoading) {
      return false;
    }

    isQuestionLoading = true;
    resetQuestionControls();
    const question = chooseQuestion();
    if (!question) {
      return false;
    }

    const questionGeneration = generation + 1;
    generation = questionGeneration;
    currentQuestion = question;
    isAnswered = false;
    isImageReady = false;

    errorElement.hidden = true;
    errorElement.textContent = "";
    resultElement.hidden = true;
    resultElement.classList.remove("is-correct", "is-incorrect");
    resultMessageElement.textContent = "";
    answerNameElement.textContent = "";
    videoLinkElement.removeAttribute("href");
    frameElement.setAttribute("aria-busy", "true");
    statusElement.textContent = "問題画像を読み込んでいます。";
    imageElement.alt = "どの動画のしゃりねこでしょう？";
    imageElement.removeAttribute("src");
    imageElement.style.transformOrigin = question.correct.cropPosition;
    imageElement.classList.add("is-zoomed");
    renderChoices(question, questionGeneration);
    loadQuestionImage(question, questionGeneration);
    return true;
  }

  function answerQuestion(selectedSlug, questionGeneration) {
    if (
      questionGeneration !== generation ||
      !currentQuestion ||
      isAnswered ||
      !isImageReady
    ) {
      return;
    }

    isAnswered = true;
    isImageReady = false;
    setChoicesDisabled(true);

    const isCorrect = selectedSlug === currentQuestion.correct.slug;
    choicesElement.querySelectorAll("button").forEach((button) => {
      if (button.dataset.slug === currentQuestion.correct.slug) {
        button.classList.add("is-correct");
        button.textContent = `○ ${button.textContent}`;
      } else if (button.dataset.slug === selectedSlug) {
        button.classList.add("is-incorrect");
        button.textContent = `× ${button.textContent}`;
      }
    });

    imageElement.classList.remove("is-zoomed");
    imageElement.style.transformOrigin = "50% 50%";
    imageElement.alt = `${currentQuestion.correct.label}のしゃりねこ`;
    resultMessageElement.textContent = isCorrect
      ? "正解です！見つかりました。"
      : "こちらのしゃりねこでした。";
    answerNameElement.textContent = currentQuestion.correct.label;
    videoLinkElement.href = currentQuestion.correct.pageUrl;
    resultElement.classList.add(isCorrect ? "is-correct" : "is-incorrect");
    resultElement.hidden = false;
    nextButtonElement.disabled = false;
    retryButtonElement.hidden = true;
    retryButtonElement.disabled = true;
    statusElement.textContent = "回答結果を表示しました。";
    previousCorrectSlug = currentQuestion.correct.slug;
    resultHeadingElement.focus({ preventScroll: false });
  }

  function requestNextQuestion() {
    if (isQuestionLoading || nextButtonElement.disabled) {
      return;
    }
    nextButtonElement.disabled = true;
    showQuestion();
  }

  function retryQuestion() {
    if (isQuestionLoading || retryButtonElement.disabled || retryButtonElement.hidden) {
      return;
    }
    retryButtonElement.disabled = true;
    errorElement.hidden = true;
    errorElement.textContent = "";
    resultElement.hidden = true;
    choicesElement.replaceChildren();
    videoLinkElement.removeAttribute("href");
    cancelActiveImageLoader();
    showQuestion();
  }

  function initialize() {
    if (requiredElements.some((element) => !element)) {
      showInitializationFailure();
      return;
    }

    const validationError = validateWorks(works);
    if (validationError) {
      stopGame(validationError);
      return;
    }

    nextButtonElement.addEventListener("click", requestNextQuestion);
    retryButtonElement.addEventListener("click", retryQuestion);
    showQuestion();
  }

  initialize();
})();
