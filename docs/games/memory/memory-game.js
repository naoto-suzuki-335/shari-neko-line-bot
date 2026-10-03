(function () {
  "use strict";

  /* Memory game startup diagnostic: start */
  try {
    var diagnosticStatus = document.querySelector("[data-memory-game-status]");
    if (diagnosticStatus) {
      diagnosticStatus.textContent = "診断B：ゲーム本体を実行しています。";
    }
  } catch (diagnosticError) {
  }
  /* Memory game startup diagnostic: end */

  const EXPECTED_PAIR_COUNT = 4;
  const READY_MESSAGE = "カードを2枚選んでください。";
  const INITIALIZATION_ERROR_MESSAGE = "ゲームを開始できませんでした。";

  const board = document.querySelector("[data-memory-board]");
  const moveCount = document.querySelector("[data-memory-move-count]");
  const status = document.querySelector("[data-memory-game-status]");
  const completion = document.querySelector("[data-memory-completion]");
  const restartButton = document.querySelector("[data-memory-restart]");

  let deck = [];
  let firstCard = null;
  let secondCard = null;
  let isLocked = true;
  let matchedPairs = 0;
  let moves = 0;
  let pendingTimerId = null;
  let isInitialized = false;
  let isComplete = false;
  let gameGeneration = 0;
  let cardsById = null;

  function clearPendingTimer() {
    if (pendingTimerId !== null) {
      window.clearTimeout(pendingTimerId);
      pendingTimerId = null;
    }
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function showInitializationError() {
    clearPendingTimer();
    isInitialized = false;
    isLocked = true;
    isComplete = false;
    deck = [];
    firstCard = null;
    secondCard = null;
    matchedPairs = 0;
    moves = 0;
    cardsById = null;

    if (board) {
      clearElement(board);
      board.setAttribute("aria-busy", "false");
    }
    if (moveCount) {
      moveCount.textContent = "0";
    }
    if (status) {
      status.textContent = INITIALIZATION_ERROR_MESSAGE;
    }
    if (completion) {
      completion.hidden = true;
    }
    if (restartButton) {
      restartButton.hidden = true;
    }
  }

  function readConfiguration() {
    if (
      !board ||
      !moveCount ||
      !status ||
      !completion ||
      !restartButton ||
      restartButton.tagName !== "BUTTON"
    ) {
      return null;
    }

    const definitionElements = Array.from(
      document.querySelectorAll("[data-memory-card-definition]")
    );
    const cardBack = (board.dataset.cardBack || "").trim();
    const mismatchDelayText = (board.dataset.mismatchDelay || "").trim();
    const mismatchDelay = Number(mismatchDelayText);
    const completionMessage = (completion.textContent || "").trim();

    if (
      definitionElements.length !== EXPECTED_PAIR_COUNT ||
      !cardBack ||
      !/^\d+$/.test(mismatchDelayText) ||
      !Number.isSafeInteger(mismatchDelay) ||
      mismatchDelay < 0 ||
      !completionMessage
    ) {
      return null;
    }

    const definitions = [];
    const pairIds = new Set();

    for (const element of definitionElements) {
      const pairId = (element.dataset.cardId || "").trim();
      const name = (element.dataset.cardName || "").trim();
      const imagePath = (element.dataset.cardImage || "").trim();

      if (!pairId || !name || !imagePath || pairIds.has(pairId)) {
        return null;
      }

      pairIds.add(pairId);
      definitions.push({ pairId, name, imagePath });
    }

    return { definitions, cardBack, mismatchDelay };
  }

  let configuration = null;

  function shuffleDeck(cards) {
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const currentCard = cards[index];
      cards[index] = cards[randomIndex];
      cards[randomIndex] = currentCard;
    }
  }

  function createDeck() {
    const cards = [];

    for (const definition of configuration.definitions) {
      for (let copyNumber = 1; copyNumber <= 2; copyNumber += 1) {
        cards.push({
          id: `${definition.pairId}-${copyNumber}`,
          pairId: definition.pairId,
          name: definition.name,
          imagePath: definition.imagePath,
          position: 0,
          button: null,
          isFaceUp: false,
          isMatched: false,
          imageUnavailable: false
        });
      }
    }

    shuffleDeck(cards);
    cards.forEach((card, index) => {
      card.position = index + 1;
    });
    return cards;
  }

  function updateCardPresentation(card) {
    const button = card.button;
    if (!button) {
      return;
    }

    button.classList.toggle("is-flipped", card.isFaceUp);
    button.classList.toggle("is-matched", card.isMatched);
    button.classList.toggle("is-image-unavailable", card.imageUnavailable);
    button.setAttribute("aria-pressed", card.isFaceUp ? "true" : "false");

    if (card.isMatched) {
      button.setAttribute(
        "aria-label",
        `${card.position}番のカード、${card.name}、一致済み`
      );
      button.disabled = true;
    } else if (card.isFaceUp) {
      button.setAttribute(
        "aria-label",
        `${card.position}番のカード、${card.name}を開いています`
      );
    } else {
      button.setAttribute("aria-label", `${card.position}番のカード、裏向き`);
    }
  }

  function markImageUnavailable(pairId) {
    for (const card of deck) {
      if (card.pairId === pairId && !card.imageUnavailable) {
        card.imageUnavailable = true;
        updateCardPresentation(card);
      }
    }
  }

  function createCardButton(card) {
    const button = document.createElement("button");
    const back = document.createElement("span");
    const front = document.createElement("span");
    const image = document.createElement("img");
    const fallback = document.createElement("span");

    button.type = "button";
    button.className = "memory-card";
    button.dataset.cardId = card.id;
    button.dataset.pairId = card.pairId;

    back.className = "memory-card__back";
    back.setAttribute("aria-hidden", "true");
    back.textContent = configuration.cardBack;

    front.className = "memory-card__front";
    front.setAttribute("aria-hidden", "true");

    image.className = "memory-card__image";
    image.alt = "";
    image.addEventListener(
      "error",
      function () {
        markImageUnavailable(card.pairId);
      },
      { once: true }
    );
    image.src = card.imagePath;

    fallback.className = "memory-card__fallback";
    fallback.textContent = card.name;

    front.append(image, fallback);
    button.append(back, front);
    button.addEventListener("click", handleCardSelection);
    card.button = button;
    updateCardPresentation(card);
    return button;
  }

  function resetTurnSelection() {
    firstCard = null;
    secondCard = null;
  }

  function finishGame() {
    isComplete = true;
    isLocked = true;
    completion.hidden = false;
    restartButton.hidden = false;
    status.textContent = completion.textContent.trim();
    completion.tabIndex = -1;
    completion.focus();
  }

  function resolveMatchingCards() {
    firstCard.isMatched = true;
    secondCard.isMatched = true;
    updateCardPresentation(firstCard);
    updateCardPresentation(secondCard);
    matchedPairs += 1;
    resetTurnSelection();

    if (matchedPairs === EXPECTED_PAIR_COUNT) {
      finishGame();
      return;
    }

    status.textContent = `一致しました。残り${EXPECTED_PAIR_COUNT - matchedPairs}組です。`;
    isLocked = false;
  }

  function resolveMismatchedCards() {
    const cardsToHide = [firstCard, secondCard];
    const scheduledGeneration = gameGeneration;

    pendingTimerId = window.setTimeout(function () {
      pendingTimerId = null;
      if (scheduledGeneration !== gameGeneration || !isInitialized) {
        return;
      }

      for (const card of cardsToHide) {
        card.isFaceUp = false;
        updateCardPresentation(card);
      }
      resetTurnSelection();
      status.textContent = READY_MESSAGE;
      isLocked = false;
    }, configuration.mismatchDelay);
  }

  function compareSelectedCards() {
    if (firstCard.pairId === secondCard.pairId) {
      resolveMatchingCards();
    } else {
      status.textContent = "違う絵柄です。カードを戻します。";
      resolveMismatchedCards();
    }
  }

  function handleCardSelection(event) {
    if (!isInitialized || isLocked || isComplete) {
      return;
    }

    const button = event.currentTarget;
    const cardId = button && button.dataset ? button.dataset.cardId : "";
    const card = cardsById.get(cardId);

    if (
      !card ||
      card.button !== button ||
      !board.contains(button) ||
      card.isMatched ||
      card.isFaceUp ||
      card === firstCard
    ) {
      return;
    }

    card.isFaceUp = true;
    updateCardPresentation(card);

    if (firstCard === null) {
      firstCard = card;
      status.textContent = "もう1枚選んでください。";
      return;
    }

    secondCard = card;
    moves += 1;
    moveCount.textContent = String(moves);
    isLocked = true;
    compareSelectedCards();
  }

  function startGame(shouldFocusFirstCard) {
    try {
      clearPendingTimer();
      gameGeneration += 1;
      isInitialized = false;
      isComplete = false;
      isLocked = true;
      firstCard = null;
      secondCard = null;
      matchedPairs = 0;
      moves = 0;
      deck = [];
      cardsById = new Map();

      board.setAttribute("aria-busy", "true");
      clearElement(board);
      moveCount.textContent = "0";
      status.textContent = "ゲームを準備しています。";
      completion.hidden = true;
      restartButton.hidden = true;

      deck = createDeck();
      const fragment = document.createDocumentFragment();

      for (const card of deck) {
        if (cardsById.has(card.id)) {
          throw new Error("Duplicate card identifier");
        }
        cardsById.set(card.id, card);
        fragment.append(createCardButton(card));
      }

      if (deck.length !== EXPECTED_PAIR_COUNT * 2) {
        throw new Error("Unexpected card count");
      }

      board.append(fragment);
      status.textContent = READY_MESSAGE;
      board.setAttribute("aria-busy", "false");
      isInitialized = true;
      isLocked = false;

      if (shouldFocusFirstCard && deck[0] && deck[0].button) {
        deck[0].button.focus();
      }
    } catch (error) {
      showInitializationError();
    }
  }

  function initializeGame() {
    try {
      configuration = readConfiguration();
      if (!configuration) {
        showInitializationError();
        return;
      }

      restartButton.addEventListener("click", function () {
        startGame(true);
      });
      startGame(false);
    } catch (error) {
      showInitializationError();
    }
  }

  initializeGame();
})();
