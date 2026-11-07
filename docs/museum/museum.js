(() => {
  "use strict";

  const API_BASE = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";
  const REQUEST_TIMEOUT_MS = 10000;
  const FAILURE_MESSAGE = "本日の展示はただいま準備中です。";
  const INITIALIZATION_ERROR_ID = "museum-initialization-error";
  const JST_TIME_ZONE = "Asia/Tokyo";

  const artworks = Object.freeze([
    Object.freeze({ objectId: 366514, shortName: "クッションいたずら隊", comment: "現場確認中です。こぼしたのは私ではありません。" }),
    Object.freeze({ objectId: 552058, shortName: "ミイラ箱の母猫", comment: "子猫同伴で出勤しています。" }),
    Object.freeze({ objectId: 47358, shortName: "猫と子猫たち", comment: "本日は家族営業です。" }),
    Object.freeze({ objectId: 203392, shortName: "磁器の猫", comment: "作者への質問は受け付けていません。" }),
    Object.freeze({ objectId: 197496, shortName: "縞模様の猫", comment: "姿勢よく待機しています。" }),
    Object.freeze({ objectId: 199447, shortName: "茶色の猫", comment: "芸術について考えるふりをしています。" }),
    Object.freeze({ objectId: 544118, shortName: "猫の棺像", comment: "長期勤務に対応した設計です。" }),
    Object.freeze({ objectId: 545725, shortName: "青緑の猫像", comment: "二名体制で営業しています。" }),
    Object.freeze({ objectId: 552027, shortName: "細身の猫像", comment: "本日は姿勢よく営業しています。" }),
    Object.freeze({ objectId: 366513, shortName: "猫たちの帰宅", comment: "ただいま帰社しました。" }),
    Object.freeze({ objectId: 552042, shortName: "青銅の猫像", comment: "静かに受付を担当しています。" })
  ]);

  const dom = {
    panel: document.getElementById("museum-panel"),
    status: document.getElementById("museum-status"),
    display: document.getElementById("museum-display"),
    image: document.getElementById("museum-image"),
    date: document.getElementById("museum-date"),
    shortName: document.getElementById("museum-short-name"),
    title: document.getElementById("museum-title"),
    artist: document.getElementById("museum-artist"),
    objectDate: document.getElementById("museum-object-date"),
    comment: document.getElementById("museum-comment"),
    objectLink: document.getElementById("museum-object-link"),
    attribution: document.getElementById("museum-attribution")
  };

  const requiredDom = Object.values(dom);
  let generation = 0;
  let activeController = null;
  let activeImageLoader = null;

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
    parent.appendChild(message);
    return message;
  }

  function failInitialization() {
    const messageTarget = getInitializationMessageTarget();
    if (messageTarget) {
      messageTarget.textContent = FAILURE_MESSAGE;
      messageTarget.hidden = false;
    }
    if (dom.display) {
      dom.display.hidden = true;
    }
    if (dom.image) {
      dom.image.hidden = true;
      dom.image.removeAttribute("src");
      dom.image.alt = "";
    }
  }

  function getJstDateParts(now) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: JST_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const values = {};
    for (const part of formatter.formatToParts(now)) {
      if (part.type === "year" || part.type === "month" || part.type === "day") {
        values[part.type] = Number(part.value);
      }
    }
    if (!Number.isInteger(values.year) || !Number.isInteger(values.month) || !Number.isInteger(values.day)) {
      throw new Error("Invalid JST date");
    }
    return values;
  }

  function selectArtwork(now) {
    const parts = getJstDateParts(now);
    const dayNumber = Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000);
    const index = ((dayNumber % artworks.length) + artworks.length) % artworks.length;
    return {
      artwork: artworks[index],
      dateLabel: `${parts.year}年${parts.month}月${parts.day}日`
    };
  }

  function isOfficialUrl(value, host, pathPrefix) {
    if (typeof value !== "string" || value.length === 0) {
      return false;
    }
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === host && url.pathname.startsWith(pathPrefix);
    } catch (_error) {
      return false;
    }
  }

  function isOfficialObjectUrl(value, expectedId) {
    if (typeof value !== "string" || value.length === 0) {
      return false;
    }
    try {
      const url = new URL(value);
      return url.protocol === "https:"
        && url.hostname === "www.metmuseum.org"
        && url.origin === "https://www.metmuseum.org"
        && url.port === ""
        && url.username === ""
        && url.password === ""
        && url.pathname === `/art/collection/search/${expectedId}`
        && url.search === ""
        && url.hash === "";
    } catch (_error) {
      return false;
    }
  }

  function validateObject(data, expectedId) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid object response");
    }
    if (data.objectID !== expectedId || data.isPublicDomain !== true) {
      throw new Error("Unexpected object");
    }
    if (typeof data.title !== "string" || data.title.trim() === "") {
      throw new Error("Missing title");
    }
    if (!isOfficialUrl(data.primaryImageSmall, "images.metmuseum.org", "/")) {
      throw new Error("Invalid image URL");
    }
    if (!isOfficialObjectUrl(data.objectURL, expectedId)) {
      throw new Error("Invalid object URL");
    }
    return {
      title: data.title.trim(),
      artist: typeof data.artistDisplayName === "string" && data.artistDisplayName.trim() !== ""
        ? data.artistDisplayName.trim()
        : "作者不詳",
      objectDate: typeof data.objectDate === "string" && data.objectDate.trim() !== ""
        ? data.objectDate.trim()
        : "制作年不詳",
      imageUrl: data.primaryImageSmall,
      objectUrl: data.objectURL
    };
  }

  function showFailure(currentGeneration) {
    if (currentGeneration !== generation) {
      return;
    }
    dom.status.textContent = FAILURE_MESSAGE;
    dom.status.hidden = false;
    dom.display.hidden = true;
    dom.image.hidden = true;
    dom.image.removeAttribute("src");
    dom.image.alt = "";
  }

  function renderArtwork(selection, details, currentGeneration, loader) {
    if (currentGeneration !== generation || loader !== activeImageLoader) {
      return;
    }
    dom.image.src = details.imageUrl;
    dom.image.alt = `${selection.artwork.shortName}。${details.title}`;
    dom.image.hidden = false;
    dom.date.textContent = `${selection.dateLabel}の展示`;
    dom.shortName.textContent = selection.artwork.shortName;
    dom.title.textContent = details.title;
    dom.artist.textContent = details.artist;
    dom.objectDate.textContent = details.objectDate;
    dom.comment.textContent = selection.artwork.comment;
    dom.objectLink.href = details.objectUrl;
    dom.status.hidden = true;
    dom.display.hidden = false;
  }

  async function loadTodayArtwork() {
    const currentGeneration = ++generation;
    if (activeController) {
      activeController.abort();
    }
    activeController = new AbortController();
    const controller = activeController;
    activeImageLoader = null;
    dom.status.textContent = "本日の展示を準備しています…";
    dom.status.hidden = false;
    dom.display.hidden = true;
    dom.image.hidden = true;
    dom.image.removeAttribute("src");
    dom.image.alt = "";

    let selection;
    try {
      selection = selectArtwork(new Date());
    } catch (_error) {
      showFailure(currentGeneration);
      return;
    }

    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE}${selection.artwork.objectId}`, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        signal: controller.signal
      });
      if (currentGeneration !== generation || controller !== activeController || controller.signal.aborted) {
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const details = validateObject(await response.json(), selection.artwork.objectId);
      if (currentGeneration !== generation || controller !== activeController || controller.signal.aborted) {
        return;
      }

      const loader = new Image();
      activeImageLoader = loader;
      loader.onload = () => renderArtwork(selection, details, currentGeneration, loader);
      loader.onerror = () => {
        if (currentGeneration === generation && loader === activeImageLoader) {
          showFailure(currentGeneration);
        }
      };
      loader.src = details.imageUrl;
    } catch (error) {
      if (currentGeneration === generation && controller === activeController) {
        showFailure(currentGeneration);
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function initialize() {
    if (dom.panel && dom.panel.dataset.museumInitialized === "true") {
      return;
    }
    if (requiredDom.some((element) => !element)) {
      if (dom.panel) {
        dom.panel.dataset.museumInitialized = "true";
      }
      failInitialization();
      return;
    }
    dom.panel.dataset.museumInitialized = "true";
    loadTodayArtwork();
  }

  initialize();
})();
