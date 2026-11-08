(() => {
  "use strict";

  const IMAGE_ENDPOINT = "https://cataas.com/cat";
  const REQUEST_TIMEOUT_MS = 10000;
  const LOADING_MESSAGE = "ただいま猫を呼んでいます…";
  const SUCCESS_MESSAGE = "本日の勤務猫です。";
  const FAILURE_MESSAGE = "本日の猫は、ただいま物陰にいます。";
  const INITIALIZATION_MESSAGE = "ねこ休憩室を開けませんでした。";
  const INITIALIZATION_ERROR_ID = "cat-lounge-initialization-error";
  const IMAGE_ALT = "CATAASから届いた猫の写真";

  const dom = {
    panel: document.getElementById("cat-lounge-panel"),
    status: document.getElementById("cat-lounge-status"),
    imageSlot: document.getElementById("cat-image-slot"),
    button: document.getElementById("cat-lounge-button"),
    attribution: document.getElementById("cat-lounge-attribution")
  };

  const requiredDom = Object.values(dom);
  let generation = 0;
  let activeImageLoader = null;
  let activeTimeoutId = null;
  let isLoading = false;

  function getInitializationMessageTarget() {
    if (dom.status) {
      return dom.status;
    }

    const existing = document.getElementById(INITIALIZATION_ERROR_ID);
    if (existing) {
      return existing;
    }

    const parent = dom.panel || document.querySelector("main") || document.body;
    if (!parent) {
      return null;
    }

    const message = document.createElement("p");
    message.id = INITIALIZATION_ERROR_ID;
    message.setAttribute("role", "alert");
    message.textContent = INITIALIZATION_MESSAGE;
    parent.appendChild(message);
    return message;
  }

  function failInitialization() {
    const target = getInitializationMessageTarget();
    if (target) {
      target.textContent = INITIALIZATION_MESSAGE;
      target.hidden = false;
    }
    if (dom.button) {
      dom.button.disabled = true;
      dom.button.hidden = true;
    }
  }

  function buildImageUrl(currentGeneration) {
    const url = new URL(IMAGE_ENDPOINT);
    url.searchParams.set("type", "square");
    url.searchParams.set("cache", `${Date.now()}-${currentGeneration}`);
    return url.href;
  }

  function isCurrentRequest(currentGeneration, loader) {
    return currentGeneration === generation && loader === activeImageLoader;
  }

  function clearCurrentTimeout() {
    if (activeTimeoutId !== null) {
      window.clearTimeout(activeTimeoutId);
      activeTimeoutId = null;
    }
  }

  function finishFailure(currentGeneration, loader) {
    if (!isCurrentRequest(currentGeneration, loader)) {
      return;
    }
    clearCurrentTimeout();
    activeImageLoader = null;
    isLoading = false;
    dom.status.textContent = FAILURE_MESSAGE;
    dom.status.hidden = false;
    dom.button.disabled = false;
  }

  function finishSuccess(currentGeneration, loader) {
    if (!isCurrentRequest(currentGeneration, loader)) {
      return;
    }
    clearCurrentTimeout();
    activeImageLoader = null;
    isLoading = false;
    loader.className = "cat-lounge-image";
    loader.alt = IMAGE_ALT;
    dom.imageSlot.replaceChildren(loader);
    dom.status.textContent = SUCCESS_MESSAGE;
    dom.status.hidden = false;
    dom.button.disabled = false;
  }

  function requestCat() {
    if (isLoading) {
      return;
    }

    isLoading = true;
    dom.button.disabled = true;
    dom.status.textContent = LOADING_MESSAGE;
    dom.status.hidden = false;

    const currentGeneration = ++generation;
    const loader = new Image();
    activeImageLoader = loader;
    loader.onload = () => finishSuccess(currentGeneration, loader);
    loader.onerror = () => finishFailure(currentGeneration, loader);
    activeTimeoutId = window.setTimeout(() => {
      if (isCurrentRequest(currentGeneration, loader)) {
        finishFailure(currentGeneration, loader);
      }
    }, REQUEST_TIMEOUT_MS);
    loader.src = buildImageUrl(currentGeneration);
  }

  function initialize() {
    if (dom.panel && dom.panel.dataset.catLoungeInitialized === "true") {
      return;
    }
    if (requiredDom.some((element) => !element)) {
      if (dom.panel) {
        dom.panel.dataset.catLoungeInitialized = "true";
      }
      failInitialization();
      return;
    }

    dom.panel.dataset.catLoungeInitialized = "true";
    dom.button.addEventListener("click", () => {
      if (isLoading) {
        return;
      }
      dom.button.disabled = true;
      requestCat();
    });
    requestCat();
  }

  initialize();
})();
