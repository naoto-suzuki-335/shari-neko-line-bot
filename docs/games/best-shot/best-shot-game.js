(function () {
  "use strict";

  var ROUND_DURATIONS = [3.8, 3.3, 2.8, 2.4, 2.0];
  var ROUND_MESSAGES = [
    "得意の前転、披露します。",
    "もう一度、転がります。",
    "少し速くなります。",
    "まだ転がれます。",
    "最後の前転です。"
  ];
  var STAGE_HEIGHT = 240;
  var CAT_SIZE = 112;
  var FRAME_SIZE = 156;
  var BEST_SHOT_DISTANCE = 14;
  var SUCCESS_DISTANCE = 32;
  var REDUCED_MOTION_SPEED_FACTOR = 0.7;
  var MAX_DELTA_SECONDS = 0.05;
  var DEGREES_PER_PIXEL = 360 / (Math.PI * CAT_SIZE);
  var CAT_IMAGE_PATH = "../../assets/images/games/best-shot/rolling-sharineko.png";

  var roundIndex = 0;
  var phase = "idle";
  var catX = 0;
  var catAngle = 0;
  var speed = 0;
  var lastFrameTime = 0;
  var animationFrameId = null;
  var gameGeneration = 0;
  var isLocked = true;
  var shotResult = null;
  var isInitialized = false;
  var stageWidth = 0;
  var travelStartX = 0;
  var travelEndX = 0;
  var isPagePaused = false;
  var reducedMotion = false;
  var motionQuery = null;
  var elements = null;

  function cancelAnimation() {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function invalidatePendingWork() {
    cancelAnimation();
    gameGeneration += 1;
    isPagePaused = false;
  }

  function setStatus(message) {
    if (elements && elements.status) {
      elements.status.textContent = message;
    }
  }

  function scrollToPlayArea() {
    if (!elements || !elements.playArea || typeof elements.playArea.scrollIntoView !== "function") {
      return;
    }
    try {
      elements.playArea.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start"
      });
    } catch (error) {
      try {
        elements.playArea.scrollIntoView();
      } catch (fallbackError) {
        return;
      }
    }
  }

  function scrollToResultAction(button) {
    if (!button || button.hidden || typeof button.scrollIntoView !== "function") {
      return;
    }
    try {
      button.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest"
      });
    } catch (error) {
      try {
        button.scrollIntoView();
      } catch (fallbackError) {
        return;
      }
    }
  }

  function readNumberAttribute(element, name) {
    var value = element ? element.getAttribute(name) : "";
    if (!value || !/^\d+$/.test(value)) {
      return null;
    }
    return Number(value);
  }

  function hasComputedSize(element, expectedWidth, expectedHeight) {
    if (!element || typeof window.getComputedStyle !== "function") {
      return false;
    }
    var style = window.getComputedStyle(element);
    var width = parseFloat(style.width);
    var height = parseFloat(style.height);
    return (expectedWidth === null || width === expectedWidth) &&
      (expectedHeight === null || height === expectedHeight);
  }

  function readElements() {
    return {
      status: document.querySelector("[data-best-shot-status]"),
      startPanel: document.querySelector("[data-best-shot-start-panel]"),
      startButton: document.querySelector("[data-best-shot-start]"),
      gamePanel: document.querySelector("[data-best-shot-game-panel]"),
      playArea: document.querySelector("[data-best-shot-play-area]"),
      round: document.querySelector("[data-best-shot-round]"),
      roundMessage: document.querySelector("[data-best-shot-round-message]"),
      stage: document.querySelector("[data-best-shot-stage]"),
      frame: document.querySelector("[data-best-shot-frame]"),
      catMover: document.querySelector("[data-best-shot-cat-mover]"),
      catImage: document.querySelector("[data-best-shot-cat-image]"),
      catFallback: document.querySelector("[data-best-shot-cat-fallback]"),
      shootButton: document.querySelector("[data-best-shot-shoot]"),
      result: document.querySelector("[data-best-shot-result]"),
      resultMessage: document.querySelector("[data-best-shot-result-message]"),
      nextButton: document.querySelector("[data-best-shot-next]"),
      retryButton: document.querySelector("[data-best-shot-retry]"),
      resetButtons: Array.prototype.slice.call(document.querySelectorAll("[data-best-shot-reset]")),
      completion: document.querySelector("[data-best-shot-completion]"),
      replayButton: document.querySelector("[data-best-shot-replay]")
    };
  }

  function validateElements() {
    if (
      !elements.status ||
      !elements.startPanel ||
      !elements.startButton ||
      !elements.gamePanel ||
      !elements.playArea ||
      !elements.round ||
      !elements.roundMessage ||
      !elements.stage ||
      !elements.frame ||
      !elements.catMover ||
      !elements.catImage ||
      !elements.catFallback ||
      !elements.shootButton ||
      !elements.result ||
      !elements.resultMessage ||
      !elements.nextButton ||
      !elements.retryButton ||
      elements.resetButtons.length !== 2 ||
      !elements.completion ||
      !elements.replayButton
    ) {
      return false;
    }
    if (
      elements.startButton.tagName !== "BUTTON" ||
      elements.shootButton.tagName !== "BUTTON" ||
      elements.nextButton.tagName !== "BUTTON" ||
      elements.retryButton.tagName !== "BUTTON" ||
      elements.replayButton.tagName !== "BUTTON" ||
      elements.resetButtons.some(function (button) { return button.tagName !== "BUTTON"; })
    ) {
      return false;
    }
    if (
      readNumberAttribute(elements.stage, "data-stage-height") !== STAGE_HEIGHT ||
      readNumberAttribute(elements.stage, "data-cat-size") !== CAT_SIZE ||
      readNumberAttribute(elements.stage, "data-frame-size") !== FRAME_SIZE ||
      readNumberAttribute(elements.stage, "data-best-distance") !== BEST_SHOT_DISTANCE ||
      readNumberAttribute(elements.stage, "data-success-distance") !== SUCCESS_DISTANCE ||
      !hasComputedSize(elements.stage, null, STAGE_HEIGHT) ||
      !hasComputedSize(elements.frame, FRAME_SIZE, FRAME_SIZE) ||
      !hasComputedSize(elements.catMover, CAT_SIZE, CAT_SIZE) ||
      !hasComputedSize(elements.catImage, CAT_SIZE, CAT_SIZE) ||
      BEST_SHOT_DISTANCE <= 0 ||
      BEST_SHOT_DISTANCE >= SUCCESS_DISTANCE ||
      SUCCESS_DISTANCE >= FRAME_SIZE / 2 ||
      ROUND_DURATIONS.length !== 5 ||
      ROUND_MESSAGES.length !== ROUND_DURATIONS.length ||
      elements.catImage.getAttribute("src") !== CAT_IMAGE_PATH ||
      !elements.startButton.disabled ||
      !elements.shootButton.disabled ||
      !elements.gamePanel.hidden ||
      !elements.result.hidden ||
      !elements.completion.hidden
    ) {
      return false;
    }
    return (
      typeof window.requestAnimationFrame === "function" &&
      typeof window.cancelAnimationFrame === "function" &&
      window.performance &&
      typeof window.performance.now === "function"
    );
  }

  function hideResult() {
    elements.result.hidden = true;
    elements.resultMessage.textContent = "";
    elements.nextButton.hidden = true;
    elements.retryButton.hidden = true;
  }

  function hideCompletion() {
    elements.completion.hidden = true;
  }

  function renderCat() {
    elements.catMover.style.transform = "translate3d(" + String(catX - CAT_SIZE / 2) + "px, 0, 0)";
    elements.catImage.style.transform = reducedMotion ? "rotate(0deg)" : "rotate(" + String(catAngle) + "deg)";
  }

  function updateRoundDisplay() {
    elements.round.textContent = String(roundIndex + 1) + " / " + String(ROUND_DURATIONS.length);
    elements.roundMessage.textContent = ROUND_MESSAGES[roundIndex];
  }

  function calculateRoundGeometry() {
    stageWidth = elements.stage.clientWidth;
    if (!Number.isFinite(stageWidth) || stageWidth <= FRAME_SIZE) {
      return false;
    }
    travelStartX = -CAT_SIZE / 2;
    travelEndX = stageWidth + CAT_SIZE / 2;
    var travelDistance = travelEndX - travelStartX;
    speed = travelDistance / ROUND_DURATIONS[roundIndex];
    if (reducedMotion) {
      speed *= REDUCED_MOTION_SPEED_FACTOR;
    }
    return Number.isFinite(speed) && speed > 0;
  }

  function showInitializationError() {
    cancelAnimation();
    isInitialized = false;
    isLocked = true;
    phase = "idle";
    if (elements) {
      if (elements.startButton) {
        elements.startButton.disabled = true;
      }
      if (elements.shootButton) {
        elements.shootButton.disabled = true;
      }
      if (elements.stage) {
        elements.stage.setAttribute("aria-busy", "false");
      }
    }
    setStatus("ゲームを開始できませんでした。");
  }

  function showRuntimeError() {
    invalidatePendingWork();
    isInitialized = false;
    isLocked = true;
    phase = "idle";
    elements.stage.setAttribute("aria-busy", "false");
    elements.shootButton.disabled = true;
    elements.nextButton.hidden = true;
    elements.retryButton.hidden = true;
    elements.resultMessage.textContent = "ゲームを続けられませんでした。";
    elements.result.hidden = false;
    setStatus("ゲームを続けられませんでした。");
  }

  function showImageFallback() {
    elements.catImage.hidden = true;
    elements.catFallback.hidden = false;
    setStatus("画像を表示できないため、文字でしゃりねこを表示しています。");
  }

  function showRoundFailure(message, result) {
    cancelAnimation();
    phase = "round-failed";
    isLocked = true;
    shotResult = result;
    elements.stage.setAttribute("aria-busy", "false");
    elements.shootButton.disabled = true;
    elements.resultMessage.textContent = message;
    elements.result.hidden = false;
    elements.nextButton.hidden = true;
    elements.retryButton.hidden = false;
    setStatus(message);
    elements.retryButton.focus();
    scrollToResultAction(elements.retryButton);
  }

  function completeGame() {
    invalidatePendingWork();
    phase = "completed";
    isLocked = true;
    elements.stage.setAttribute("aria-busy", "false");
    elements.shootButton.disabled = true;
    elements.playArea.hidden = true;
    elements.completion.hidden = false;
    setStatus("撮影、完了です。前転も終わりました。");
    elements.completion.focus();
  }

  function showRoundSuccess(message, result) {
    cancelAnimation();
    phase = "round-cleared";
    isLocked = true;
    shotResult = result;
    elements.stage.setAttribute("aria-busy", "false");
    elements.shootButton.disabled = true;
    elements.resultMessage.textContent = message;
    elements.result.hidden = false;
    elements.nextButton.textContent = roundIndex === ROUND_DURATIONS.length - 1
      ? "撮影を終える"
      : "次のラウンドへ";
    elements.nextButton.hidden = false;
    elements.retryButton.hidden = true;
    setStatus(message);
    elements.nextButton.focus();
    scrollToResultAction(elements.nextButton);
  }

  function animateFrame(timestamp, generation) {
    animationFrameId = null;
    if (generation !== gameGeneration || phase !== "rolling" || isLocked || isPagePaused) {
      return;
    }
    try {
      var deltaSeconds = Math.max(0, Math.min((timestamp - lastFrameTime) / 1000, MAX_DELTA_SECONDS));
      lastFrameTime = timestamp;
      var movedDistance = speed * deltaSeconds;
      catX += movedDistance;
      if (!reducedMotion) {
        catAngle = (catAngle + movedDistance * DEGREES_PER_PIXEL) % 360;
      }
      if (catX >= travelEndX) {
        catX = travelEndX;
        renderCat();
        showRoundFailure("通り過ぎました。", "passed");
        return;
      }
      renderCat();
      animationFrameId = window.requestAnimationFrame(function (nextTimestamp) {
        animateFrame(nextTimestamp, generation);
      });
    } catch (error) {
      showRuntimeError();
    }
  }

  function beginRound(shouldScroll) {
    invalidatePendingWork();
    if (!calculateRoundGeometry()) {
      showRuntimeError();
      return;
    }
    var generation = gameGeneration;
    phase = "rolling";
    isLocked = false;
    shotResult = null;
    catX = travelStartX;
    catAngle = 0;
    isPagePaused = false;
    updateRoundDisplay();
    hideResult();
    hideCompletion();
    elements.playArea.hidden = false;
    elements.stage.setAttribute("aria-busy", "true");
    elements.shootButton.disabled = false;
    renderCat();
    setStatus(ROUND_MESSAGES[roundIndex] + " 撮影するを押してください。");
    lastFrameTime = window.performance.now();
    animationFrameId = window.requestAnimationFrame(function (timestamp) {
      animateFrame(timestamp, generation);
    });
    if (shouldScroll) {
      scrollToPlayArea();
    }
  }

  function startFromRoundOne() {
    invalidatePendingWork();
    roundIndex = 0;
    phase = "idle";
    isLocked = true;
    shotResult = null;
    elements.startPanel.hidden = true;
    elements.gamePanel.hidden = false;
    elements.playArea.hidden = false;
    beginRound(true);
  }

  function handleStart() {
    if (!isInitialized || phase !== "idle" || elements.startButton.disabled) {
      return;
    }
    startFromRoundOne();
  }

  function handleShoot() {
    if (!isInitialized || phase !== "rolling" || isLocked || elements.shootButton.disabled) {
      return;
    }
    isLocked = true;
    phase = "judged";
    cancelAnimation();
    elements.stage.setAttribute("aria-busy", "false");
    elements.shootButton.disabled = true;
    var frameCenterX = stageWidth / 2;
    var distance = Math.abs(catX - frameCenterX);
    if (distance <= BEST_SHOT_DISTANCE) {
      showRoundSuccess("ベストショットです。", "best");
    } else if (distance <= SUCCESS_DISTANCE) {
      showRoundSuccess("きれいに撮れました。", "success");
    } else if (catX < frameCenterX) {
      showRoundFailure("少し早かったようです。", "early");
    } else {
      showRoundFailure("少し遅かったようです。", "late");
    }
  }

  function handleNextRound() {
    if (!isInitialized || phase !== "round-cleared" || !isLocked) {
      return;
    }
    if (roundIndex === ROUND_DURATIONS.length - 1) {
      completeGame();
      return;
    }
    roundIndex += 1;
    beginRound(true);
  }

  function handleRetry() {
    if (!isInitialized || phase !== "round-failed" || !isLocked) {
      return;
    }
    beginRound(true);
  }

  function handleReplay() {
    if (!isInitialized || phase !== "completed") {
      return;
    }
    startFromRoundOne();
  }

  function resetToIdle() {
    if (!isInitialized) {
      return;
    }
    invalidatePendingWork();
    roundIndex = 0;
    phase = "idle";
    catX = 0;
    catAngle = 0;
    speed = 0;
    lastFrameTime = 0;
    shotResult = null;
    isLocked = true;
    stageWidth = 0;
    travelStartX = 0;
    travelEndX = 0;
    elements.stage.setAttribute("aria-busy", "false");
    elements.shootButton.disabled = true;
    hideResult();
    hideCompletion();
    elements.playArea.hidden = false;
    elements.gamePanel.hidden = true;
    elements.startPanel.hidden = false;
    updateRoundDisplay();
    setStatus("ゲームを始めてください。");
    elements.startButton.focus();
  }

  function handleVisibilityChange() {
    if (!isInitialized || phase !== "rolling") {
      return;
    }
    if (document.hidden) {
      cancelAnimation();
      isPagePaused = true;
      isLocked = true;
      elements.shootButton.disabled = true;
      setStatus("ゲームを一時停止しています。");
      return;
    }
    if (!isPagePaused) {
      return;
    }
    isPagePaused = false;
    isLocked = false;
    elements.shootButton.disabled = false;
    lastFrameTime = window.performance.now();
    var generation = gameGeneration;
    setStatus(ROUND_MESSAGES[roundIndex] + " 撮影するを押してください。");
    animationFrameId = window.requestAnimationFrame(function (timestamp) {
      animateFrame(timestamp, generation);
    });
  }

  function handleResize() {
    if (!isInitialized || phase !== "rolling") {
      return;
    }
    invalidatePendingWork();
    showRoundFailure("画面の大きさが変わりました。もう一度ねらってください。", "resized");
  }

  function handleMotionChange(event) {
    reducedMotion = Boolean(event && event.matches);
    if (phase === "rolling" && calculateRoundGeometry()) {
      renderCat();
    }
  }

  function initialize() {
    try {
      elements = readElements();
      if (!validateElements()) {
        showInitializationError();
        return;
      }
      motionQuery = typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
      reducedMotion = Boolean(motionQuery && motionQuery.matches);
      elements.startButton.addEventListener("click", handleStart);
      elements.shootButton.addEventListener("click", handleShoot);
      elements.nextButton.addEventListener("click", handleNextRound);
      elements.retryButton.addEventListener("click", handleRetry);
      elements.replayButton.addEventListener("click", handleReplay);
      elements.resetButtons.forEach(function (button) {
        button.addEventListener("click", resetToIdle);
      });
      elements.catImage.addEventListener("error", showImageFallback);
      if (elements.catImage.complete && elements.catImage.naturalWidth === 0) {
        showImageFallback();
      }
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("resize", handleResize);
      if (motionQuery) {
        if (typeof motionQuery.addEventListener === "function") {
          motionQuery.addEventListener("change", handleMotionChange);
        } else if (typeof motionQuery.addListener === "function") {
          motionQuery.addListener(handleMotionChange);
        }
      }
      isInitialized = true;
      isLocked = true;
      phase = "idle";
      elements.startButton.disabled = false;
      setStatus("ゲームを始めてください。");
    } catch (error) {
      showInitializationError();
    }
  }

  initialize();
}());
