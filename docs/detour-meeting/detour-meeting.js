(() => {
  "use strict";

  const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxXKswZP441jRweNeKVJmpwH-pIF-tcaqw5xxv1iXm7_OEN9Ormp3NDn9ObkaCraQHm/exec";
  const REQUEST_TIMEOUT_MS = 15000;
  const STORAGE_KEY = "sharineko-detour-last-shop-id";
  const HOTPEPPER_URL_PREFIX = "https://www.hotpepper.jp/";
  const AGAIN_BUTTON_LABEL = "もう一度相談する";
  const AREA_KEYS = new Set([
    "chigasaki", "fujisawa", "yokohama", "kannai-sakuragicho",
    "kawasaki", "shinagawa", "tokyo-nihombashi"
  ]);
  const GENRE_KEYS = new Set(["meal", "cafe", "drinks", "omakase"]);
  const FRIENDLY_ERROR = "うまく相談できませんでした。少し待ってから、もう一度お試しください。";

  const dom = {
    form: document.getElementById("detour-form"),
    consultButton: document.getElementById("consult-button"),
    status: document.getElementById("detour-status"),
    result: document.getElementById("detour-result"),
    name: document.getElementById("shop-name"),
    comment: document.getElementById("cat-comment"),
    commentText: document.getElementById("cat-comment-text"),
    tags: document.getElementById("feature-tags"),
    genre: document.getElementById("shop-genre"),
    distance: document.getElementById("shop-distance"),
    budget: document.getElementById("shop-budget"),
    address: document.getElementById("shop-address"),
    link: document.getElementById("shop-link"),
    againButton: document.getElementById("again-button")
  };

  if (Object.values(dom).some((element) => !element)) {
    return;
  }

  let candidates = [];
  let lastShopId = readLastShopId();
  let activeController = null;
  let isAgainBusy = false;

  dom.form.addEventListener("submit", handleSubmit);
  dom.againButton.addEventListener("click", handleAgain);

  function handleAgain() {
    if (candidates.length === 0 || isAgainBusy) {
      return;
    }

    setAgainButtonBusy(true);
    try {
      displayRandomCandidate();
    } catch (error) {
      showStatus(FRIENDLY_ERROR);
    } finally {
      setAgainButtonBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(dom.form);
    const areaKey = formData.get("area");
    const genreKey = formData.get("genre");
    if (typeof areaKey !== "string" || typeof genreKey !== "string" ||
        !AREA_KEYS.has(areaKey) || !GENRE_KEYS.has(genreKey)) {
      showStatus("エリアとジャンルを選んでください。");
      return;
    }

    setLoading(true);
    hideResult();
    showStatus("しゃりねこが寄り道先を探しています…");
    candidates = [];

    const controller = new AbortController();
    activeController = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = new URL(GAS_ENDPOINT);
      url.search = new URLSearchParams({ areaKey, genreKey }).toString();
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "omit",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error("Request failed");
      }

      const payload = await response.json();
      candidates = validateResponse(payload, areaKey, genreKey);
      displayRandomCandidate();
    } catch (error) {
      candidates = [];
      hideResult();
      showStatus(FRIENDLY_ERROR);
    } finally {
      window.clearTimeout(timeoutId);
      if (activeController === controller) {
        activeController = null;
        setLoading(false);
        setAgainButtonBusy(false);
      }
    }
  }

  function validateResponse(payload, requestedArea, requestedGenre) {
    if (!isPlainObject(payload) || payload.ok !== true ||
        !matchesSelection(payload.area, requestedArea) ||
        !matchesSelection(payload.genre, requestedGenre) ||
        !Array.isArray(payload.candidates) || payload.candidates.length === 0) {
      throw new Error("Invalid response");
    }

    return payload.candidates.map(validateCandidate);
  }

  function matchesSelection(value, requestedKey) {
    if (value === requestedKey) {
      return true;
    }
    return isPlainObject(value) && value.key === requestedKey;
  }

  function validateCandidate(candidate) {
    if (!isPlainObject(candidate)) {
      throw new Error("Invalid candidate");
    }

    if (!isPlainObject(candidate.genre) || !isPlainObject(candidate.budget)) {
      throw new Error("Invalid candidate details");
    }

    const genreCode = requiredText(candidate.genre.code);
    const genreName = requiredText(candidate.genre.name);
    const budgetName = optionalText(candidate.budget.name);
    const budgetAverage = optionalText(candidate.budget.average);
    const budget = budgetName || budgetAverage || "予算情報なし";
    if (typeof candidate.distanceMeters !== "number" ||
        !Number.isFinite(candidate.distanceMeters) || candidate.distanceMeters < 0) {
      throw new Error("Invalid distance");
    }

    const normalized = {
      id: requiredText(candidate.id),
      name: requiredText(candidate.name),
      genre: Object.freeze({ code: genreCode, name: genreName }),
      distanceMeters: candidate.distanceMeters,
      budget,
      hasBudget: budgetName !== "" || budgetAverage !== "",
      address: requiredText(candidate.address),
      url: requiredText(candidate.url)
    };
    if (!isAllowedShopUrl(normalized.url)) {
      throw new Error("Invalid shop URL");
    }
    return Object.freeze(normalized);
  }

  function buildFeatureTags(candidate) {
    let distanceTag;
    if (candidate.distanceMeters <= 300) {
      distanceTag = "300m以内";
    } else if (candidate.distanceMeters <= 500) {
      distanceTag = "500m以内";
    } else if (candidate.distanceMeters <= 1000) {
      distanceTag = "1km以内";
    } else {
      distanceTag = "少し歩きます";
    }

    const tags = [distanceTag];
    const genreName = candidate.genre.name.trim();
    if (genreName.length <= 20) {
      tags.push(genreName);
    }
    if (candidate.hasBudget) {
      tags.push("予算目安あり");
    }
    return Array.from(new Set(tags)).slice(0, 3);
  }

  function buildCatComment(candidate) {
    let templates;
    if (candidate.distanceMeters <= 300 && candidate.hasBudget) {
      templates = [
        "近めで予算の目安もあり。話が早めです。",
        "すぐそこ寄りです。お財布とも相談できます。"
      ];
    } else if (candidate.distanceMeters <= 300) {
      templates = [
        "近めです。寄り道の足どりも軽めです。",
        "すぐそこ寄りです。ふらりと向かえそうです。"
      ];
    } else if (candidate.distanceMeters <= 500) {
      templates = [
        "ほどよく近めです。するっと向かえそうです。",
        "軽く歩いて、寄り道会議の続きです。"
      ];
    } else if (candidate.distanceMeters <= 1000) {
      templates = [
        "少し歩けば到着です。寄り道向きかもです。",
        "歩ける距離です。のんびり向かいますか。"
      ];
    } else {
      templates = [
        "少し歩きます。のんびり向かう寄り道です。",
        "足をのばして、ゆるりと向かう候補です。"
      ];
    }

    let stableNumber = 0;
    for (const character of candidate.id) {
      stableNumber = (stableNumber * 31 + character.codePointAt(0)) >>> 0;
    }
    return templates[stableNumber % templates.length];
  }

  function requiredText(value) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("Missing text");
    }
    return value.trim();
  }

  function optionalText(value) {
    if (value === undefined || value === null || value === "") {
      return "";
    }
    return requiredText(value);
  }

  function isAllowedShopUrl(value) {
    try {
      const url = new URL(value);
      return value.startsWith(HOTPEPPER_URL_PREFIX) &&
        url.protocol === "https:" && url.hostname === "www.hotpepper.jp";
    } catch (error) {
      return false;
    }
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function displayRandomCandidate() {
    const pool = candidates.length > 1
      ? candidates.filter((candidate) => candidate.id !== lastShopId)
      : candidates;
    const available = pool.length > 0 ? pool : candidates;
    const candidate = available[Math.floor(Math.random() * available.length)];
    if (!candidate) {
      hideResult();
      showStatus(FRIENDLY_ERROR);
      return;
    }

    dom.name.textContent = candidate.name;
    dom.genre.textContent = candidate.genre.name;
    dom.distance.textContent = `${candidate.distanceMeters}m`;
    dom.budget.textContent = candidate.budget;
    dom.address.textContent = candidate.address;
    dom.link.href = candidate.url;
    dom.commentText.textContent = buildCatComment(candidate);
    dom.comment.hidden = false;
    dom.tags.replaceChildren();
    const fragment = document.createDocumentFragment();
    buildFeatureTags(candidate).forEach((tag) => {
      const item = document.createElement("li");
      item.className = "feature-tag";
      item.textContent = tag;
      fragment.appendChild(item);
    });
    dom.tags.appendChild(fragment);
    dom.tags.hidden = dom.tags.childElementCount === 0;
    dom.result.hidden = false;
    lastShopId = candidate.id;
    writeLastShopId(lastShopId);
    showStatus("このお店はいかがでしょうか。");
  }

  function hideResult() {
    dom.result.hidden = true;
    dom.name.textContent = "";
    dom.commentText.textContent = "";
    dom.comment.hidden = true;
    dom.tags.replaceChildren();
    dom.tags.hidden = true;
    dom.genre.textContent = "";
    dom.distance.textContent = "";
    dom.budget.textContent = "";
    dom.address.textContent = "";
    dom.link.removeAttribute("href");
  }

  function setLoading(isLoading) {
    dom.consultButton.disabled = isLoading;
    dom.form.querySelectorAll("input").forEach((input) => {
      input.disabled = isLoading;
    });
  }

  function setAgainButtonBusy(isBusy) {
    isAgainBusy = isBusy;
    dom.againButton.classList.toggle("is-busy", isBusy);
    if (isBusy) {
      dom.againButton.setAttribute("aria-disabled", "true");
      dom.againButton.textContent = "選んでいます…";
      return;
    }
    dom.againButton.removeAttribute("aria-disabled");
    dom.againButton.textContent = AGAIN_BUTTON_LABEL;
  }

  function showStatus(message) {
    dom.status.textContent = message;
  }

  function readLastShopId() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function writeLastShopId(shopId) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, shopId);
    } catch (error) {
      // Storage is optional; the in-memory value still prevents an immediate repeat.
    }
  }
})();
