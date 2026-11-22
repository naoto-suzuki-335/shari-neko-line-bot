(() => {
  "use strict";

  const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxXKswZP441jRweNeKVJmpwH-pIF-tcaqw5xxv1iXm7_OEN9Ormp3NDn9ObkaCraQHm/exec";
  const REQUEST_TIMEOUT_MS = 15000;
  const STORAGE_KEY = "sharineko-detour-last-shop-id";
  const HOTPEPPER_URL_PREFIX = "https://www.hotpepper.jp/";
  const AGAIN_BUTTON_LABEL = "もう一度相談する";
  const LOADING_STATUS = "しゃりねこが寄り道先を探しています…";
  const SOLO_LOADING_STATUS = "ひとりで寄りやすそうな候補を見ています…";
  const LOADING_STATUS_BY_GENRE = new Map([
    ["meal", "ごはんの候補を見ています…"],
    ["cafe", "ひと休みの候補を見ています…"],
    ["drinks", "一杯の候補を見ています…"],
    ["omakase", "しゃりねこ、気まぐれに選んでいます…"]
  ]);
  const STATUS_BOTTOM_GAP = 48;
  const AREA_KEYS = new Set([
    "chigasaki", "fujisawa", "yokohama", "kannai-sakuragicho",
    "kawasaki", "shinagawa", "tokyo-nihombashi"
  ]);
  const GENRE_KEYS = new Set(["meal", "cafe", "drinks", "omakase"]);
  const FRIENDLY_ERROR = "うまく相談できませんでした。少し待ってから、もう一度お試しください。";

  const dom = {
    form: document.getElementById("detour-form"),
    genreSelection: document.getElementById("genre-selection"),
    seatPreference: document.getElementById("seat-preference"),
    soloPreference: document.getElementById("solo-preference"),
    consultButton: document.getElementById("consult-button"),
    status: document.getElementById("detour-status"),
    result: document.getElementById("detour-result"),
    credit: document.getElementById("hotpepper-credit"),
    name: document.getElementById("shop-name"),
    comment: document.getElementById("cat-comment"),
    commentEmoji: document.getElementById("cat-comment-emoji"),
    commentText: document.getElementById("cat-comment-text"),
    tags: document.getElementById("feature-tags"),
    preferenceNote: document.getElementById("preference-note"),
    facilityTags: document.getElementById("facility-tags"),
    genre: document.getElementById("shop-genre"),
    distance: document.getElementById("shop-distance"),
    budget: document.getElementById("shop-budget"),
    address: document.getElementById("shop-address"),
    hoursLabel: document.getElementById("shop-hours-label"),
    hours: document.getElementById("shop-hours"),
    closedLabel: document.getElementById("shop-closed-label"),
    closed: document.getElementById("shop-closed"),
    accessLabel: document.getElementById("shop-access-label"),
    access: document.getElementById("shop-access"),
    link: document.getElementById("shop-link"),
    againButton: document.getElementById("again-button")
  };

  if (Object.values(dom).some((element) => !element)) {
    return;
  }

  dom.soloPreference.checked = false;

  let candidates = [];
  let lastShopId = readLastShopId();
  let selectedGenreKey = "";
  let searchPreference = Object.freeze({ requested: false, expanded: false, known: false });
  let activeController = null;
  let isAgainBusy = false;
  let requestGeneration = 0;

  dom.form.addEventListener("submit", handleSubmit);
  dom.form.addEventListener("change", handleFormChange);
  dom.againButton.addEventListener("click", handleAgain);

  function handleFormChange(event) {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.name === "area" && input.checked) {
      scheduleAreaSelectionScroll();
    } else if (input instanceof HTMLInputElement && input.name === "genre" && input.checked) {
      scheduleSelectionEndScroll();
    }
  }

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
    const soloPreference = formData.get("soloPreference");
    if (typeof areaKey !== "string" || typeof genreKey !== "string" ||
        !AREA_KEYS.has(areaKey) || !GENRE_KEYS.has(genreKey) ||
        (soloPreference !== null && soloPreference !== "counter")) {
      showStatus("エリアとジャンルを選んでください。");
      return;
    }

    const prefersSolo = soloPreference === "counter";
    selectedGenreKey = genreKey;
    const generation = ++requestGeneration;
    const controller = new AbortController();
    activeController = controller;
    setLoading(true);
    hideResult();
    const loadingStatus = getLoadingStatus(genreKey, prefersSolo);
    showStatus(loadingStatus);
    scheduleStatusScroll(controller, generation, loadingStatus, true);
    candidates = [];

    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = new URL(GAS_ENDPOINT);
      const requestParameters = new URLSearchParams({ areaKey, genreKey });
      if (prefersSolo) {
        requestParameters.set("soloPreference", "counter");
      }
      url.search = requestParameters.toString();
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "omit",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error("Request failed");
      }

      const payload = await response.json();
      const validated = validateResponse(payload, areaKey, genreKey, prefersSolo);
      candidates = validated.candidates;
      searchPreference = validated.preference;
      displayRandomCandidate();
      scheduleResultScroll();
    } catch (error) {
      candidates = [];
      searchPreference = Object.freeze({ requested: false, expanded: false, known: false });
      hideResult();
      showStatus(FRIENDLY_ERROR);
      scheduleStatusScroll(controller, generation, FRIENDLY_ERROR);
    } finally {
      window.clearTimeout(timeoutId);
      if (activeController === controller) {
        activeController = null;
        setLoading(false);
        setAgainButtonBusy(false);
      }
    }
  }

  function validateResponse(payload, requestedArea, requestedGenre, requestedSolo) {
    if (!isPlainObject(payload) || payload.ok !== true ||
        !matchesSelection(payload.area, requestedArea) ||
        !matchesSelection(payload.genre, requestedGenre) ||
        !Array.isArray(payload.candidates) || payload.candidates.length === 0) {
      throw new Error("Invalid response");
    }

    return Object.freeze({
      candidates: payload.candidates.map(validateCandidate),
      preference: validateSearchPreference(
        payload.preference,
        payload.capabilities,
        requestedSolo
      )
    });
  }

  function validateSearchPreference(preference, capabilities, requestedSolo) {
    if ((preference === undefined || preference === null) &&
        (capabilities === undefined || capabilities === null)) {
      return Object.freeze({ requested: requestedSolo, expanded: false, known: false });
    }
    if (!isPlainObject(capabilities) || capabilities.counterPriority !== true ||
        !isPlainObject(preference) ||
        typeof preference.requested !== "boolean" ||
        typeof preference.expanded !== "boolean" ||
        preference.requested !== requestedSolo ||
        (!preference.requested && preference.expanded)) {
      throw new Error("Invalid preference response");
    }
    return Object.freeze({
      requested: preference.requested,
      expanded: preference.expanded,
      known: true
    });
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
    const openingHours = meaningfulOptionalText(candidate.openingHours);
    const closed = meaningfulOptionalText(candidate.closed);
    const access = meaningfulOptionalText(candidate.access);
    const facilityTags = validateFacilityTags(candidate.featureTags);
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
      openingHours,
      closed,
      access,
      facilityTags,
      url: requiredText(candidate.url)
    };
    if (!isAllowedShopUrl(normalized.url)) {
      throw new Error("Invalid shop URL");
    }
    return Object.freeze(normalized);
  }

  function validateFacilityTags(tags) {
    if (tags === undefined || tags === null) {
      return Object.freeze([]);
    }
    if (!Array.isArray(tags) || tags.length > 2) {
      throw new Error("Invalid candidate feature tags");
    }
    const normalized = tags.map((tag) => {
      const text = meaningfulOptionalText(tag);
      if (!text || text.length > 40) {
        throw new Error("Invalid candidate feature tag");
      }
      return text;
    });
    if (new Set(normalized).size !== normalized.length) {
      throw new Error("Duplicate candidate feature tag");
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

  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function buildCatComment(candidate, genreKey) {
    const pool = [];
    if (candidate.distanceMeters <= 300) {
      pool.push(
        "近めです。寄り道の足どりも軽めです。",
        "すぐそこ寄りです。ふらりと向かえそうです。",
        "近さは十分です。あとは気分の会議です。",
        "この距離なら、寄り道も軽やかです。"
      );
    } else if (candidate.distanceMeters <= 500) {
      pool.push(
        "ほどよく近めです。するっと向かえそうです。",
        "軽く歩いて、寄り道会議の続きです。",
        "遠すぎません。ゆるりと向かえる距離です。",
        "ほどよい距離です。気分が向けば出発です。"
      );
    } else if (candidate.distanceMeters <= 1000) {
      pool.push(
        "少し歩けば到着です。寄り道向きかもです。",
        "歩ける距離です。のんびり向かいますか。",
        "少し足をのばして、寄り道してみますか。",
        "散歩を兼ねるなら、ちょうどよさそうです。"
      );
    } else {
      pool.push(
        "少し歩きます。のんびり向かう寄り道です。",
        "足をのばして、ゆるりと向かう候補です。",
        "ちょっと遠めです。時間とも相談しましょう。",
        "小さな遠足気分で、候補に残しておきます。"
      );
    }

    const genreComments = {
      meal: [
        "お腹の会議は、こちらを推しています。",
        "今日はしっかり食べる方向でどうでしょう。",
        "ごはんの気分なら、候補に残します。"
      ],
      cafe: [
        "ひと息候補として、そっと置いておきます。",
        "少し休む会議なら、こちらも候補です。",
        "カフェ時間の候補に、そっと加えておきます。"
      ],
      drinks: [
        "一杯寄る余白、残っていますか。",
        "帰る前に少しだけ、という案です。",
        "今夜の寄り道候補に、そっと入れます。"
      ],
      omakase: [
        "今日は幅広めに、候補を出しました。",
        "しゃりねこ裁量で、こちらを選びました。",
        "おまかせ会議の候補は、こちらです。"
      ]
    };
    if (Object.prototype.hasOwnProperty.call(genreComments, genreKey)) {
      pool.push(...genreComments[genreKey]);
    }

    if (candidate.hasBudget) {
      pool.push(
        "予算の目安ありです。お財布と小さく相談です。",
        "予算を眺めつつ、ゆっくり決めますか。"
      );
    }

    pool.push(
      "今日の候補はこちらです。ひとまず眺めます。",
      "寄り道会議、こちらも議題に入れます。",
      "決めきれない時間も、寄り道のうちです。"
    );
    const key = `${candidate.id}|${genreKey}`;
    return pool[stableHash(key) % pool.length];
  }

  function buildCatCommentEmoji(candidate, genreKey) {
    if (genreKey === "meal") {
      return "🍚";
    }
    if (genreKey === "cafe") {
      return "☕";
    }
    if (genreKey === "drinks") {
      const drinksEmoji = ["🍺", "🍷"];
      const key = `${candidate.id}|${genreKey}|emoji`;
      return drinksEmoji[stableHash(key) % drinksEmoji.length];
    }
    return "🐈";
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

  function meaningfulOptionalText(value) {
    const text = optionalText(value);
    return ["未確認", "不明", "情報なし"].includes(text) ? "" : text;
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

  function scheduleAreaSelectionScroll() {
    scheduleScroll(scrollAreaSelectionIfNeeded);
  }

  function scheduleSelectionEndScroll() {
    scheduleScroll(scrollSelectionEndIfNeeded);
  }

  function scheduleStatusScroll(controller, generation, message, requireActiveRequest = false) {
    scheduleScroll(() => {
      if (generation !== requestGeneration || dom.status.textContent !== message) {
        return;
      }
      if (requireActiveRequest && activeController !== controller) {
        return;
      }
      scrollStatusIfNeeded();
    });
  }

  function scheduleResultScroll() {
    scheduleScroll(scrollResultIfNeeded);
  }

  function scheduleScroll(scroll) {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(scroll);
      return;
    }
    scroll();
  }

  function scrollAreaSelectionIfNeeded() {
    const genreRect = dom.genreSelection.getBoundingClientRect();
    const statusRect = dom.status.getBoundingClientRect();
    const viewport = getViewportBounds();
    if (!viewport) {
      return;
    }

    const controlsRect = {
      top: genreRect.top,
      bottom: statusRect.bottom,
      height: statusRect.bottom - genreRect.top
    };
    if (controlsRect.height <= viewport.height) {
      scrollRectIfNeeded(controlsRect, viewport);
      return;
    }
    scrollIfNeeded(dom.genreSelection);
  }

  function scrollSelectionEndIfNeeded() {
    const preferenceRect = dom.seatPreference.getBoundingClientRect();
    const statusRect = dom.status.getBoundingClientRect();
    const viewport = getViewportBounds();
    if (!viewport) {
      return;
    }

    scrollRectIfNeeded({
      top: preferenceRect.top,
      bottom: statusRect.bottom,
      height: statusRect.bottom - preferenceRect.top
    }, viewport);
  }

  function scrollStatusIfNeeded() {
    const statusRect = dom.status.getBoundingClientRect();
    const viewport = getConservativeViewportBounds();
    if (!viewport) {
      return;
    }

    const distance = statusRect.bottom + STATUS_BOTTOM_GAP - viewport.bottom;
    if (Number.isFinite(distance) && distance >= 1) {
      scrollByDistance(distance);
    }
  }

  function scrollResultIfNeeded() {
    const resultRect = dom.result.getBoundingClientRect();
    const creditRect = dom.credit.getBoundingClientRect();
    const viewport = getViewportBounds();
    if (!viewport) {
      return;
    }

    const resultAndCreditRect = {
      top: resultRect.top,
      bottom: creditRect.bottom,
      height: creditRect.bottom - resultRect.top
    };
    if (resultAndCreditRect.height <= viewport.height) {
      scrollRectIfNeeded(resultAndCreditRect, viewport);
      return;
    }
    scrollIfNeeded(dom.result);
  }

  function scrollIfNeeded(target, bottomGap = 0) {
    if (!target || target.hidden || typeof target.getBoundingClientRect !== "function") {
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const rect = bottomGap > 0
      ? {
          top: targetRect.top,
          bottom: targetRect.bottom + bottomGap,
          height: targetRect.height + bottomGap
        }
      : targetRect;
    const viewport = getViewportBounds();
    if (!viewport) {
      return;
    }
    scrollRectIfNeeded(rect, viewport);
  }

  function getViewportBounds() {
    const viewport = window.visualViewport;
    const viewportTop = viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
    const viewportHeight = viewport && Number.isFinite(viewport.height)
      ? viewport.height
      : window.innerHeight;
    if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
      return null;
    }
    return {
      top: viewportTop,
      bottom: viewportTop + viewportHeight,
      height: viewportHeight
    };
  }

  function getConservativeViewportBounds() {
    const viewport = window.visualViewport;
    const viewportTop = viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
    const heights = [];
    if (viewport && Number.isFinite(viewport.height) && viewport.height > 0) {
      heights.push(viewport.height);
    }
    if (Number.isFinite(window.innerHeight) && window.innerHeight > 0) {
      heights.push(window.innerHeight);
    }
    if (heights.length === 0) {
      return null;
    }

    const viewportHeight = Math.min(...heights);
    return {
      top: viewportTop,
      bottom: viewportTop + viewportHeight,
      height: viewportHeight
    };
  }

  function scrollRectIfNeeded(rect, viewport) {
    let distance = 0;
    if (rect.height > viewport.height) {
      distance = rect.top - viewport.top;
    } else if (rect.top < viewport.top) {
      distance = rect.top - viewport.top;
    } else if (rect.bottom > viewport.bottom) {
      distance = rect.bottom - viewport.bottom;
    }
    if (!Number.isFinite(distance) || Math.abs(distance) < 1) {
      return;
    }

    scrollByDistance(distance);
  }

  function scrollByDistance(distance) {
    const reduceMotion = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduceMotion ? "auto" : "smooth";
    try {
      window.scrollBy({ top: distance, left: 0, behavior });
    } catch (error) {
      try {
        window.scrollBy(0, distance);
      } catch (fallbackError) {
        try {
          window.scrollTo(window.scrollX, window.scrollY + distance);
        } catch (ignoredError) {
          // 自動スクロールだけを中止し、既存処理は継続する。
        }
      }
    }
  }

  function getLoadingStatus(genreKey, prefersSolo) {
    if (prefersSolo) {
      return SOLO_LOADING_STATUS;
    }
    return LOADING_STATUS_BY_GENRE.get(genreKey) || LOADING_STATUS;
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
    setOptionalDetail(dom.hoursLabel, dom.hours, candidate.openingHours);
    setOptionalDetail(dom.closedLabel, dom.closed, candidate.closed);
    setOptionalDetail(dom.accessLabel, dom.access, candidate.access);
    dom.link.href = candidate.url;
    dom.commentEmoji.textContent = buildCatCommentEmoji(candidate, selectedGenreKey);
    dom.commentText.textContent = buildCatComment(candidate, selectedGenreKey);
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
    dom.preferenceNote.textContent = getPreferenceNote(searchPreference);
    dom.preferenceNote.hidden = dom.preferenceNote.textContent === "";
    dom.facilityTags.replaceChildren();
    const facilityFragment = document.createDocumentFragment();
    candidate.facilityTags.forEach((tag) => {
      const item = document.createElement("li");
      item.className = "feature-tag";
      item.textContent = tag;
      facilityFragment.appendChild(item);
    });
    dom.facilityTags.appendChild(facilityFragment);
    dom.facilityTags.hidden = dom.facilityTags.childElementCount === 0;
    dom.result.hidden = false;
    lastShopId = candidate.id;
    writeLastShopId(lastShopId);
    showStatus("このお店はいかがでしょうか。");
  }

  function getPreferenceNote(preference) {
    if (!preference.known || !preference.requested) {
      return "";
    }
    return preference.expanded
      ? "条件を少し広げて見つけました。"
      : "カウンターの記載を手がかりに選びました。";
  }

  function setOptionalDetail(label, valueElement, value) {
    valueElement.textContent = value;
    const hidden = value === "";
    label.hidden = hidden;
    valueElement.hidden = hidden;
  }

  function hideResult() {
    dom.result.hidden = true;
    dom.name.textContent = "";
    dom.commentEmoji.textContent = "";
    dom.commentText.textContent = "";
    dom.comment.hidden = true;
    dom.tags.replaceChildren();
    dom.tags.hidden = true;
    dom.preferenceNote.textContent = "";
    dom.preferenceNote.hidden = true;
    dom.facilityTags.replaceChildren();
    dom.facilityTags.hidden = true;
    dom.genre.textContent = "";
    dom.distance.textContent = "";
    dom.budget.textContent = "";
    dom.address.textContent = "";
    setOptionalDetail(dom.hoursLabel, dom.hours, "");
    setOptionalDetail(dom.closedLabel, dom.closed, "");
    setOptionalDetail(dom.accessLabel, dom.access, "");
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
