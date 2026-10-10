(function () {
  "use strict";

  var DISPLAY_DURATION_MS = 1000;
  var DISPLAY_GAP_MS = 250;
  var INPUT_LOCK_MS = 120;
  var ROUND_LENGTHS = [2, 3, 4, 5, 6];
  var EXPECTED_ITEMS = [
    { id: "maguro", name: "マグロ", image: "../../assets/images/games/order-memory/maguro-neko.png" },
    { id: "tamago", name: "たまご", image: "../../assets/images/games/order-memory/tamago-neko.png" },
    { id: "ebi", name: "えび", image: "../../assets/images/games/order-memory/ebi-neko.png" },
    { id: "edamame", name: "枝豆", image: "../../assets/images/games/order-memory/edamame.png" },
    { id: "beer", name: "ビール", image: "../../assets/images/games/order-memory/beer.png" },
    { id: "imo-mizu", name: "芋水", image: "../../assets/images/games/order-memory/imo-mizu.png" }
  ];

  var mode = null;
  var roundIndex = 0;
  var orderSequence = [];
  var answerIndex = 0;
  var currentPlayer = 1;
  var phase = "idle";
  var isLocked = true;
  var pendingTimerIds = [];
  var gameGeneration = 0;
  var isInitialized = false;
  var elements = null;
  var menuItems = [];
  var itemsById = Object.create(null);
  var unavailableImages = Object.create(null);

  function clearElement(element) {
    while (element && element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function clearPendingTimers() {
    pendingTimerIds.forEach(function (timerId) {
      window.clearTimeout(timerId);
    });
    pendingTimerIds = [];
  }

  function invalidatePendingWork() {
    clearPendingTimers();
    gameGeneration += 1;
  }

  function schedule(callback, delay, generation) {
    var timerId = window.setTimeout(function () {
      pendingTimerIds = pendingTimerIds.filter(function (candidate) {
        return candidate !== timerId;
      });
      if (generation !== gameGeneration) {
        return;
      }
      callback();
    }, delay);
    pendingTimerIds.push(timerId);
  }

  function setStatus(message) {
    if (elements && elements.status) {
      elements.status.textContent = message;
    }
  }

  function setMenuEnabled(enabled) {
    menuItems.forEach(function (item) {
      item.button.disabled = !enabled;
    });
  }

  function setPlayerStatus() {
    if (mode !== "alternate" || phase === "completed") {
      elements.currentPlayer.hidden = true;
      elements.currentPlayer.textContent = "";
      return;
    }
    elements.currentPlayer.textContent = "プレイヤー" + currentPlayer + "の番です。";
    elements.currentPlayer.hidden = false;
  }

  function updateRoundStatus() {
    elements.round.textContent = String(roundIndex + 1) + " / " + String(ROUND_LENGTHS.length);
  }

  function hideActionArea() {
    elements.actionArea.hidden = true;
    elements.actionMessage.textContent = "";
    elements.actionMessage.hidden = true;
    elements.nextButton.hidden = true;
    elements.retryButton.hidden = true;
  }

  function hideCompletion() {
    elements.completion.hidden = true;
  }

  function showDisplayMessage(message) {
    clearElement(elements.displayContent);
    var text = document.createElement("span");
    text.textContent = message;
    elements.displayContent.appendChild(text);
  }

  function showOrderItem(item) {
    clearElement(elements.displayContent);
    if (!unavailableImages[item.id]) {
      var image = document.createElement("img");
      image.src = item.image;
      image.alt = "";
      image.width = 180;
      image.height = 180;
      image.addEventListener("error", function () {
        unavailableImages[item.id] = true;
        image.hidden = true;
      }, { once: true });
      if (image.complete && image.naturalWidth === 0) {
        unavailableImages[item.id] = true;
        image.hidden = true;
      }
      elements.displayContent.appendChild(image);
    }
    var name = document.createElement("span");
    name.textContent = item.name;
    elements.displayContent.appendChild(name);
  }

  function generateOrder(length) {
    var sequence = [];
    var index;
    for (index = 0; index < length; index += 1) {
      sequence.push(menuItems[Math.floor(Math.random() * menuItems.length)].id);
    }
    return sequence;
  }

  function beginAnswering() {
    phase = "answering";
    isLocked = false;
    answerIndex = 0;
    currentPlayer = 1;
    elements.display.setAttribute("aria-busy", "false");
    showDisplayMessage("同じ順番でメニューを選んでください。");
    setStatus("同じ順番でメニューを選んでください。");
    setPlayerStatus();
    setMenuEnabled(true);
    menuItems[0].button.focus();
  }

  function displayOrderAt(position, generation) {
    if (generation !== gameGeneration || phase !== "showing-order") {
      return;
    }
    showOrderItem(itemsById[orderSequence[position]]);
    schedule(function () {
      clearElement(elements.displayContent);
      if (position + 1 < orderSequence.length) {
        schedule(function () {
          displayOrderAt(position + 1, generation);
        }, DISPLAY_GAP_MS, generation);
      } else {
        beginAnswering();
      }
    }, DISPLAY_DURATION_MS, generation);
  }

  function showCurrentOrder() {
    invalidatePendingWork();
    var generation = gameGeneration;
    phase = "showing-order";
    isLocked = true;
    answerIndex = 0;
    currentPlayer = 1;
    hideActionArea();
    hideCompletion();
    setMenuEnabled(false);
    setPlayerStatus();
    elements.display.setAttribute("aria-busy", "true");
    setStatus("注文を覚えてください。");
    displayOrderAt(0, generation);
  }

  function beginRound(useExistingOrder) {
    if (!useExistingOrder) {
      orderSequence = generateOrder(ROUND_LENGTHS[roundIndex]);
    }
    updateRoundStatus();
    showCurrentOrder();
  }

  function startFromRoundOne() {
    invalidatePendingWork();
    roundIndex = 0;
    orderSequence = [];
    answerIndex = 0;
    currentPlayer = 1;
    phase = "idle";
    isLocked = true;
    hideActionArea();
    hideCompletion();
    elements.playArea.hidden = false;
    elements.gamePanel.hidden = false;
    elements.modePanel.hidden = true;
    beginRound(false);
  }

  function completeGame() {
    invalidatePendingWork();
    phase = "completed";
    isLocked = true;
    setMenuEnabled(false);
    elements.display.setAttribute("aria-busy", "false");
    showDisplayMessage("全ラウンドをクリアしました。");
    elements.currentPlayer.hidden = true;
    elements.currentPlayer.textContent = "";
    hideActionArea();
    elements.playArea.hidden = true;
    elements.completion.hidden = false;
    setStatus("全ラウンドをクリアしました。注文どおりです。");
    elements.completion.focus();
  }

  function clearRound() {
    isLocked = true;
    setMenuEnabled(false);
    if (roundIndex === ROUND_LENGTHS.length - 1) {
      completeGame();
      return;
    }
    phase = "round-cleared";
    elements.currentPlayer.hidden = true;
    elements.currentPlayer.textContent = "";
    elements.actionMessage.textContent = "ラウンド" + String(roundIndex + 1) + "をクリアしました。";
    elements.actionMessage.hidden = false;
    elements.nextButton.hidden = false;
    elements.retryButton.hidden = true;
    elements.actionArea.hidden = false;
    setStatus("ラウンド" + String(roundIndex + 1) + "をクリアしました。");
    elements.nextButton.focus();
  }

  function failRound() {
    invalidatePendingWork();
    phase = "round-failed";
    isLocked = true;
    answerIndex = 0;
    currentPlayer = 1;
    setMenuEnabled(false);
    setPlayerStatus();
    elements.display.setAttribute("aria-busy", "false");
    showDisplayMessage("注文と違います。もう一度確認しましょう。");
    elements.actionMessage.textContent = "";
    elements.actionMessage.hidden = true;
    elements.retryButton.hidden = false;
    elements.nextButton.hidden = true;
    elements.actionArea.hidden = false;
    setStatus("注文と違います。もう一度確認しましょう。");
    elements.retryButton.focus();
  }

  function unlockAnswering(generation) {
    schedule(function () {
      if (phase !== "answering") {
        return;
      }
      isLocked = false;
      setMenuEnabled(true);
    }, INPUT_LOCK_MS, generation);
  }

  function handleMenuSelection(event) {
    var button = event.currentTarget;
    if (!isInitialized || phase !== "answering" || isLocked || button.disabled) {
      return;
    }
    var itemId = button.getAttribute("data-order-item");
    if (!itemId || !itemsById[itemId] || !orderSequence[answerIndex]) {
      return;
    }

    isLocked = true;
    setMenuEnabled(false);
    if (itemId !== orderSequence[answerIndex]) {
      failRound();
      return;
    }

    answerIndex += 1;
    if (answerIndex === orderSequence.length) {
      clearRound();
      return;
    }

    if (mode === "alternate") {
      currentPlayer = answerIndex % 2 === 0 ? 1 : 2;
      setPlayerStatus();
    }
    unlockAnswering(gameGeneration);
  }

  function getSelectedMode() {
    var selected = null;
    elements.modeInputs.forEach(function (input) {
      if (input.checked) {
        selected = input.value;
      }
    });
    return selected;
  }

  function updateStartButtonState() {
    var selectedMode = getSelectedMode();
    elements.startButton.disabled = selectedMode !== "solo" && selectedMode !== "alternate";
  }

  function handleStart() {
    if (!isInitialized || phase !== "idle") {
      return;
    }
    var selectedMode = getSelectedMode();
    if (selectedMode !== "solo" && selectedMode !== "alternate") {
      setStatus("遊び方を選んでください。");
      elements.modeInputs[0].focus();
      return;
    }
    mode = selectedMode;
    startFromRoundOne();
  }

  function handleNextRound() {
    if (!isInitialized || phase !== "round-cleared" || isLocked !== true) {
      return;
    }
    roundIndex += 1;
    orderSequence = [];
    beginRound(false);
  }

  function handleRetry() {
    if (!isInitialized || phase !== "round-failed" || isLocked !== true || orderSequence.length === 0) {
      return;
    }
    answerIndex = 0;
    currentPlayer = 1;
    beginRound(true);
  }

  function handleRestart() {
    if (!isInitialized || !mode || elements.gamePanel.hidden) {
      return;
    }
    startFromRoundOne();
  }

  function resetToModeSelection() {
    if (!isInitialized) {
      return;
    }
    invalidatePendingWork();
    mode = null;
    roundIndex = 0;
    orderSequence = [];
    answerIndex = 0;
    currentPlayer = 1;
    phase = "idle";
    isLocked = true;
    setMenuEnabled(false);
    hideActionArea();
    hideCompletion();
    elements.playArea.hidden = false;
    elements.display.setAttribute("aria-busy", "false");
    showDisplayMessage("ゲームを始めると注文が表示されます。");
    elements.gamePanel.hidden = true;
    elements.modePanel.hidden = false;
    elements.modeInputs.forEach(function (input) {
      input.checked = false;
    });
    updateStartButtonState();
    elements.currentPlayer.hidden = true;
    elements.currentPlayer.textContent = "";
    setStatus("遊び方を選んでください。");
    elements.modeInputs[0].focus();
  }

  function readElements() {
    return {
      status: document.querySelector("[data-order-game-status]"),
      round: document.querySelector("[data-order-round]"),
      currentPlayer: document.querySelector("[data-order-current-player]"),
      display: document.querySelector("[data-order-display]"),
      displayContent: document.querySelector("[data-order-display-content]"),
      menu: document.querySelector("[data-order-menu]"),
      menuButtons: Array.prototype.slice.call(document.querySelectorAll("[data-order-item]")),
      actionArea: document.querySelector("[data-order-action]"),
      actionMessage: document.querySelector("[data-order-action-message]"),
      completion: document.querySelector("[data-order-completion]"),
      startButton: document.querySelector("[data-order-start]"),
      restartButtons: Array.prototype.slice.call(document.querySelectorAll("[data-order-restart]")),
      modeResetButtons: Array.prototype.slice.call(document.querySelectorAll("[data-order-mode-reset]")),
      modeInputs: Array.prototype.slice.call(document.querySelectorAll("[data-order-mode]")),
      modePanel: document.querySelector("[data-order-mode-panel]"),
      gamePanel: document.querySelector("[data-order-game-panel]"),
      playArea: document.querySelector("[data-order-play-area]"),
      nextButton: document.querySelector("[data-order-next]"),
      retryButton: document.querySelector("[data-order-retry]")
    };
  }

  function validateElements() {
    if (!elements.status || !elements.round || !elements.currentPlayer || !elements.display ||
        !elements.displayContent || !elements.menu || !elements.actionArea || !elements.actionMessage ||
        !elements.completion || !elements.startButton || !elements.modePanel || !elements.gamePanel ||
        !elements.playArea ||
        !elements.nextButton || !elements.retryButton || elements.menuButtons.length !== 6 ||
        elements.restartButtons.length !== 2 || elements.modeResetButtons.length !== 2 ||
        elements.modeInputs.length !== 2) {
      return false;
    }
    if (elements.modeInputs[0].value !== "solo" || elements.modeInputs[1].value !== "alternate" ||
        !elements.modeInputs[0].disabled || !elements.modeInputs[1].disabled ||
        !elements.startButton.disabled) {
      return false;
    }

    return elements.menuButtons.every(function (button, index) {
      var image = button.querySelector("img");
      var name = button.querySelector(".menu-name");
      var expected = EXPECTED_ITEMS[index];
      return Boolean(expected && image && name && button.getAttribute("data-order-item") === expected.id &&
        name.textContent.trim() === expected.name && image.getAttribute("src") === expected.image &&
        button.disabled);
    });
  }

  function buildMenuItems() {
    menuItems = elements.menuButtons.map(function (button, index) {
      var image = button.querySelector("img");
      var item = {
        id: EXPECTED_ITEMS[index].id,
        name: EXPECTED_ITEMS[index].name,
        image: EXPECTED_ITEMS[index].image,
        button: button
      };
      image.addEventListener("error", function () {
        unavailableImages[item.id] = true;
        image.hidden = true;
      }, { once: true });
      if (image.complete && image.naturalWidth === 0) {
        unavailableImages[item.id] = true;
        image.hidden = true;
      }
      button.addEventListener("click", handleMenuSelection);
      itemsById[item.id] = item;
      return item;
    });
  }

  function showInitializationError() {
    clearPendingTimers();
    gameGeneration += 1;
    phase = "idle";
    isLocked = true;
    isInitialized = false;
    if (elements) {
      if (elements.menuButtons) {
        elements.menuButtons.forEach(function (button) {
          button.disabled = true;
        });
      }
      if (elements.modeInputs) {
        elements.modeInputs.forEach(function (input) {
          input.disabled = true;
        });
      }
      if (elements.startButton) {
        elements.startButton.disabled = true;
      }
      if (elements.gamePanel) {
        elements.gamePanel.hidden = true;
      }
      if (elements.status) {
        elements.status.textContent = "ゲームを開始できませんでした。ページを再読み込みしてください。";
      }
    }
  }

  function initialize() {
    try {
      elements = readElements();
      if (!validateElements()) {
        showInitializationError();
        return;
      }

      buildMenuItems();
      elements.startButton.addEventListener("click", handleStart);
      elements.nextButton.addEventListener("click", handleNextRound);
      elements.retryButton.addEventListener("click", handleRetry);
      elements.restartButtons.forEach(function (button) {
        button.addEventListener("click", handleRestart);
      });
      elements.modeResetButtons.forEach(function (button) {
        button.addEventListener("click", resetToModeSelection);
      });

      elements.modeInputs.forEach(function (input) {
        input.disabled = false;
        input.addEventListener("change", updateStartButtonState);
      });
      elements.gamePanel.hidden = true;
      elements.playArea.hidden = false;
      phase = "idle";
      isLocked = true;
      isInitialized = true;
      updateStartButtonState();
      setStatus("遊び方を選んでください。");
    } catch (error) {
      showInitializationError();
    }
  }

  initialize();
}());
