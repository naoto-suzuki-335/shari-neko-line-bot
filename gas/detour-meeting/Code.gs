/**
 * しゃりねこ寄り道会議専用GAS Web Appの完全な手動反映用ソース。
 * 現行の専用GASプロジェクトへコピーし、既存デプロイを更新する。
 * APIキーはScript PropertiesのHOTPEPPER_API_KEYだけで管理する。
 */
function doGet(e) {
  return handleDetourRequest_(e);
}

function handleDetourRequest_(e) {
  try {
    const properties = PropertiesService.getScriptProperties();
    if (properties.getProperty("DETOUR_PROXY_DISABLED") === "1") {
      return detourErrorResponse_("service_unavailable");
    }

    const request = detourParseRequest_(e);
    if (!request) {
      return detourErrorResponse_("invalid_request");
    }

    const area = detourAreas_()[request.areaKey];
    const genre = detourGenres_()[request.genreKey];
    const sourceType = request.genreKey === "cafe" ? "cafe" : "base";
    const candidateTarget = detourCandidateTarget_(sourceType);
    let datasetResult;
    let candidates;
    let expanded = false;

    if (request.preferenceKey) {
      datasetResult = detourGetDataset_(area, sourceType, request.preferenceKey);
      if (!datasetResult.ok) {
        return detourErrorResponse_(datasetResult.code);
      }
      const priorityCandidates = detourFilterCandidates_(
        datasetResult.dataset.shops,
        request.genreKey
      ).map(function (candidate) {
        return detourCandidateWithSource_(candidate, "priority");
      });
      candidates = priorityCandidates.slice(0, candidateTarget);

      if (candidates.length < candidateTarget) {
        const supplementResult = detourGetDataset_(area, sourceType, "");
        if (supplementResult.ok) {
          expanded = true;
          candidates = detourMergeCandidates_(
            candidates,
            detourFilterCandidates_(
              supplementResult.dataset.shops,
              request.genreKey
            ),
            candidateTarget
          );
          datasetResult = {
            ok: true,
            cacheHit: datasetResult.cacheHit && supplementResult.cacheHit,
            dataset: {
              apiVersion: datasetResult.dataset.apiVersion,
              fetchedAt: supplementResult.dataset.fetchedAt,
              shops: candidates
            }
          };
        } else if (candidates.length === 0) {
          return detourErrorResponse_(supplementResult.code);
        }
      }
    } else {
      datasetResult = detourGetDataset_(area, sourceType, "");
      if (!datasetResult.ok) {
        return detourErrorResponse_(datasetResult.code);
      }
      candidates = detourFilterCandidates_(
        datasetResult.dataset.shops,
        request.genreKey
      );
    }

    const minimumCandidates = request.preferenceKey ? 1 : 2;
    if (candidates.length < minimumCandidates) {
      return detourErrorResponse_("insufficient_candidates");
    }

    return detourJsonResponse_({
      ok: true,
      service: "sharineko-detour-proxy",
      version: 2,
      area: {
        key: request.areaKey,
        label: area.label,
        rangeMeters: 1000
      },
      genre: {
        key: request.genreKey,
        label: genre.label
      },
      capabilities: {
        counterPriority: true,
        counterPrioritySupplement: true,
        todayPreference: true,
        preferencePrioritySupplement: true
      },
      preference: {
        requested: request.preferenceKey !== "",
        key: request.preferenceKey,
        expanded: expanded
      },
      apiVersion: datasetResult.dataset.apiVersion,
      fetchedAt: datasetResult.dataset.fetchedAt,
      cacheHit: datasetResult.cacheHit,
      candidateCount: candidates.length,
      candidates: candidates,
      attribution: {
        text: "Powered by ホットペッパーグルメ Webサービス",
        url: "https://webservice.recruit.co.jp/"
      }
    });
  } catch (error) {
    return detourErrorResponse_("internal_error");
  }
}

function detourParseRequest_(e) {
  if (!e || !e.parameters || typeof e.parameters !== "object") {
    return null;
  }

  const keys = Object.keys(e.parameters).sort();
  const isExistingRequest =
    keys.length === 2 && keys[0] === "areaKey" && keys[1] === "genreKey";
  const isLegacyPreferenceRequest =
    keys.length === 3 && keys[0] === "areaKey" &&
    keys[1] === "genreKey" && keys[2] === "soloPreference";
  const isPreferenceRequest =
    keys.length === 3 && keys[0] === "areaKey" &&
    keys[1] === "genreKey" && keys[2] === "preferenceKey";
  if (!isExistingRequest && !isLegacyPreferenceRequest && !isPreferenceRequest) {
    return null;
  }

  const areaValues = e.parameters.areaKey;
  const genreValues = e.parameters.genreKey;
  const soloValues = e.parameters.soloPreference;
  const preferenceValues = e.parameters.preferenceKey;
  if (!Array.isArray(areaValues) || areaValues.length !== 1 ||
      !Array.isArray(genreValues) || genreValues.length !== 1 ||
      (isLegacyPreferenceRequest &&
        (!Array.isArray(soloValues) || soloValues.length !== 1 ||
          soloValues[0] !== "counter")) ||
      (isPreferenceRequest &&
        (!Array.isArray(preferenceValues) || preferenceValues.length !== 1 ||
          !Object.prototype.hasOwnProperty.call(
            detourPreferenceSearchParams_(), preferenceValues[0]
          )))) {
    return null;
  }

  const areaKey = areaValues[0];
  const genreKey = genreValues[0];
  const areas = detourAreas_();
  const genres = detourGenres_();
  if (typeof areaKey !== "string" || typeof genreKey !== "string" ||
      !Object.prototype.hasOwnProperty.call(areas, areaKey) ||
      !Object.prototype.hasOwnProperty.call(genres, genreKey)) {
    return null;
  }

  return {
    areaKey: areaKey,
    genreKey: genreKey,
    preferenceKey: isLegacyPreferenceRequest
      ? "counter"
      : isPreferenceRequest ? preferenceValues[0] : ""
  };
}

function detourPreferenceSearchParams_() {
  return {
    "counter": { keyword: "カウンター" },
    "wine": { wine: "1" },
    "shochu": { shochu: "1" },
    "cocktail": { cocktail: "1" },
    "sake": { sake: "1" }
  };
}

function detourAreas_() {
  return {
    "chigasaki": { label: "茅ヶ崎駅周辺", lat: 35.330700, lng: 139.406700 },
    "fujisawa": { label: "藤沢駅周辺", lat: 35.338900, lng: 139.487400 },
    "yokohama": { label: "横浜駅周辺", lat: 35.465800, lng: 139.622300 },
    "kannai-sakuragicho": {
      label: "関内・桜木町周辺", lat: 35.448100, lng: 139.634000
    },
    "kawasaki": { label: "川崎駅周辺", lat: 35.531400, lng: 139.696900 },
    "shinagawa": { label: "品川駅周辺", lat: 35.628500, lng: 139.738700 },
    "tokyo-nihombashi": {
      label: "東京・日本橋周辺", lat: 35.681700, lng: 139.771900
    }
  };
}

function detourGenres_() {
  return {
    "meal": { label: "ごはん" },
    "cafe": { label: "カフェ" },
    "drinks": { label: "居酒屋・バー" },
    "omakase": { label: "おまかせ" }
  };
}

function detourGenreNames_() {
  return {
    "G001": "居酒屋",
    "G002": "ダイニングバー・バル",
    "G003": "創作料理",
    "G004": "和食",
    "G005": "洋食",
    "G006": "イタリアン・フレンチ",
    "G007": "中華",
    "G008": "焼肉・ホルモン",
    "G009": "アジア・エスニック料理",
    "G010": "各国料理",
    "G011": "カラオケ・パーティ",
    "G012": "バー・カクテル",
    "G013": "ラーメン",
    "G014": "カフェ・スイーツ",
    "G015": "その他グルメ",
    "G016": "お好み焼き・もんじゃ",
    "G017": "韓国料理"
  };
}

function detourFilterCandidates_(shops, genreKey) {
  return shops.filter(function (shop) {
    return genreKey === "omakase" || shop.category === genreKey;
  });
}

function detourCandidateTarget_(sourceType) {
  return sourceType === "cafe" ? 20 : 100;
}

function detourCandidateWithSource_(candidate, source) {
  const copy = {};
  Object.keys(candidate).forEach(function (key) {
    copy[key] = candidate[key];
  });
  copy.candidateSource = source;
  return copy;
}

function detourMergeCandidates_(priorityCandidates, normalCandidates, target) {
  const merged = priorityCandidates.slice(0, target);
  const seenIds = new Set(merged.map(function (candidate) {
    return candidate.id;
  }));
  normalCandidates.some(function (candidate) {
    if (!seenIds.has(candidate.id)) {
      merged.push(detourCandidateWithSource_(candidate, "supplement"));
      seenIds.add(candidate.id);
    }
    return merged.length >= target;
  });
  return merged;
}

function detourGetDataset_(area, sourceType, preferenceKey) {
  const cache = CacheService.getScriptCache();
  const cacheKey = detourCacheKey_(area, sourceType, preferenceKey);
  const cached = detourReadCache_(cache, cacheKey);
  if (cached) {
    return { ok: true, cacheHit: true, dataset: cached };
  }

  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    locked = lock.tryLock(5000);
  } catch (error) {
    locked = false;
  }
  if (!locked) {
    return { ok: false, code: "service_busy" };
  }

  try {
    const cachedAfterLock = detourReadCache_(cache, cacheKey);
    if (cachedAfterLock) {
      return { ok: true, cacheHit: true, dataset: cachedAfterLock };
    }

    const fetched = detourFetchDataset_(area, sourceType, preferenceKey);
    if (!fetched.ok) {
      return fetched;
    }
    try {
      cache.put(cacheKey, JSON.stringify(fetched.dataset), 900);
    } catch (error) {
      // Cache failure must not expose internal details or fail a valid response.
    }
    return { ok: true, cacheHit: false, dataset: fetched.dataset };
  } finally {
    lock.releaseLock();
  }
}

function detourCacheKey_(area, sourceType, preferenceKey) {
  return [
    "detour", "v3", sourceType, preferenceKey || "normal",
    area.lat.toFixed(6), area.lng.toFixed(6)
  ].join(":");
}

function detourReadCache_(cache, cacheKey) {
  let text;
  try {
    text = cache.get(cacheKey);
  } catch (error) {
    return null;
  }
  if (!text) {
    return null;
  }

  try {
    const value = JSON.parse(text);
    if (!value || typeof value.apiVersion !== "string" ||
        typeof value.fetchedAt !== "string" || !Array.isArray(value.shops) ||
        value.shops.length > 100) {
      cache.remove(cacheKey);
      return null;
    }
    return value;
  } catch (error) {
    try {
      cache.remove(cacheKey);
    } catch (removeError) {
      // Ignore cache cleanup failures.
    }
    return null;
  }
}

function detourFetchDataset_(area, sourceType, preferenceKey) {
  const apiKey = PropertiesService.getScriptProperties()
    .getProperty("HOTPEPPER_API_KEY");
  if (!apiKey) {
    return { ok: false, code: "service_not_configured" };
  }

  const endpoint = "https://webservice.recruit.co.jp/hotpepper/gourmet/v1/";
  const params = {
    key: apiKey,
    lat: area.lat.toFixed(6),
    lng: area.lng.toFixed(6),
    range: "3",
    count: String(detourCandidateTarget_(sourceType)),
    format: "json"
  };
  if (sourceType === "cafe") {
    params.genre = "G014";
  }
  const preferenceParams = preferenceKey
    ? detourPreferenceSearchParams_()[preferenceKey]
    : null;
  if (preferenceKey && !preferenceParams) {
    return { ok: false, code: "invalid_request" };
  }
  Object.keys(preferenceParams || {}).forEach(function (name) {
    params[name] = preferenceParams[name];
  });

  const query = Object.keys(params).map(function (name) {
    return encodeURIComponent(name) + "=" + encodeURIComponent(params[name]);
  }).join("&");
  let response;
  try {
    response = UrlFetchApp.fetch(endpoint + "?" + query, {
      method: "get",
      followRedirects: false,
      muteHttpExceptions: true
    });
  } catch (error) {
    return { ok: false, code: "upstream_unavailable" };
  }

  const status = response.getResponseCode();
  const responseBytes = response.getBlob().getBytes().length;
  if (status !== 200 || responseBytes < 2 || responseBytes > 1000000) {
    return { ok: false, code: "upstream_invalid_response" };
  }

  let data;
  try {
    data = JSON.parse(response.getContentText("UTF-8"));
  } catch (error) {
    return { ok: false, code: "upstream_invalid_json" };
  }
  const results = data && data.results ? data.results : null;
  if (!results) {
    return { ok: false, code: "upstream_invalid_schema" };
  }

  const errorItems = Array.isArray(results.error)
    ? results.error
    : results.error ? [results.error] : [];
  if (errorItems.length > 0) {
    return { ok: false, code: "upstream_api_error" };
  }

  const apiVersion = typeof results.api_version === "string"
    ? results.api_version
    : "";
  const returned = Number(results.results_returned);
  const sourceShops = Array.isArray(results.shop) ? results.shop : [];
  if (!apiVersion || apiVersion.length > 20 || !Number.isInteger(returned) ||
      returned < 0 || returned > 100 || sourceShops.length !== returned) {
    return { ok: false, code: "upstream_invalid_schema" };
  }

  const seenIds = new Set();
  const shops = [];
  sourceShops.forEach(function (shop) {
    const normalized = detourNormalizeShop_(shop, area, sourceType);
    if (!normalized || seenIds.has(normalized.id)) {
      return;
    }
    seenIds.add(normalized.id);
    shops.push(normalized);
  });

  return {
    ok: true,
    dataset: {
      apiVersion: apiVersion,
      fetchedAt: new Date().toISOString(),
      shops: shops
    }
  };
}

function detourNormalizeShop_(shop, area, sourceType) {
  if (!shop || typeof shop !== "object") {
    return null;
  }
  const id = typeof shop.id === "string" ? shop.id : "";
  if (!/^J\d{9}$/.test(id)) {
    return null;
  }

  const name = detourCleanText_(shop.name, 120);
  const address = detourCleanText_(shop.address, 200);
  const genreCode = shop.genre && typeof shop.genre.code === "string"
    ? shop.genre.code
    : "";
  const genreNames = detourGenreNames_();
  if (!name || !address ||
      !Object.prototype.hasOwnProperty.call(genreNames, genreCode)) {
    return null;
  }
  if (sourceType === "cafe" && genreCode !== "G014") {
    return null;
  }
  if (sourceType === "base" && genreCode === "G011") {
    return null;
  }

  const category = detourCategoryForGenre_(genreCode);
  if (!category) {
    return null;
  }
  const lat = Number(shop.lat);
  const lng = Number(shop.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 20 ||
      lat > 46 || lng < 122 || lng > 154) {
    return null;
  }
  const distanceMeters = Math.round(
    detourDistanceMeters_(area.lat, area.lng, lat, lng)
  );
  if (!Number.isFinite(distanceMeters) || distanceMeters > 1050) {
    return null;
  }

  const suppliedUrl = shop.urls && typeof shop.urls.pc === "string"
    ? shop.urls.pc
    : "";
  const expectedPrefix = "https://www.hotpepper.jp/str" + id;
  if (suppliedUrl.length > 500 ||
      !(suppliedUrl === expectedPrefix ||
        suppliedUrl.indexOf(expectedPrefix + "/") === 0)) {
    return null;
  }

  const subGenreCode = shop.sub_genre &&
    typeof shop.sub_genre.code === "string" &&
    Object.prototype.hasOwnProperty.call(genreNames, shop.sub_genre.code)
      ? shop.sub_genre.code : null;
  const budgetName = shop.budget
    ? detourCleanText_(shop.budget.name, 80) : null;
  const budgetAverage = shop.budget
    ? detourCleanText_(shop.budget.average, 120) : null;
  const openingHours = detourMeaningfulText_(shop.open, 1000);
  const closed = detourMeaningfulText_(shop.close, 500);
  const access = detourMeaningfulText_(shop.access, 1000);
  const visibleFields = [
    name, address, genreNames[genreCode], openingHours, closed, access
  ];

  return {
    id: id,
    name: name,
    address: address,
    category: category,
    genre: { code: genreCode, name: genreNames[genreCode] },
    subGenre: subGenreCode
      ? { code: subGenreCode, name: genreNames[subGenreCode] }
      : null,
    budget: { name: budgetName, average: budgetAverage },
    distanceMeters: distanceMeters,
    url: expectedPrefix + "/",
    openingHours: openingHours,
    closed: closed,
    access: access,
    featureTags: detourBuildFeatureTags_(shop, visibleFields)
  };
}

function detourIsAvailable_(value) {
  const text = detourCleanText_(value, 120);
  return text === "あり" || text === "利用可" ||
    (text !== null && text.indexOf("利用可") === 0);
}

function detourBuildFeatureTags_(shop, visibleFields) {
  const tags = [];
  const hasVisibleCounterText = visibleFields.some(function (value) {
    return typeof value === "string" && value.indexOf("カウンター") !== -1;
  });
  if (hasVisibleCounterText) {
    tags.push("カウンターの記載あり");
  }
  if (detourIsAvailable_(shop.card)) {
    tags.push("カード利用可");
  }
  if (detourIsAvailable_(shop.wifi)) {
    tags.push("Wi-Fiあり");
  }
  const nonSmoking = detourMeaningfulText_(shop.non_smoking, 120);
  if (nonSmoking) {
    tags.push(nonSmoking);
  }
  return Array.from(new Set(tags)).slice(0, 2);
}

function detourMeaningfulText_(value, maxLength) {
  const text = detourCleanText_(value, maxLength);
  return text === "未確認" || text === "不明" || text === "情報なし"
    ? null : text;
}

function detourCategoryForGenre_(genreCode) {
  if (["G001", "G002", "G012"].indexOf(genreCode) !== -1) {
    return "drinks";
  }
  if (genreCode === "G014") {
    return "cafe";
  }
  if ([
    "G003", "G004", "G005", "G006", "G007", "G008", "G009",
    "G010", "G013", "G015", "G016", "G017"
  ].indexOf(genreCode) !== -1) {
    return "meal";
  }
  return null;
}

function detourCleanText_(value, maxLength) {
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ").trim();
  return !cleaned || cleaned.length > maxLength ? null : cleaned;
}

function detourDistanceMeters_(lat1, lng1, lat2, lng2) {
  const toRadians = function (degrees) { return degrees * Math.PI / 180; };
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusMeters *
    (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function detourJsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function detourErrorResponse_(code) {
  const messages = {
    invalid_request: "指定内容を確認してください。",
    service_unavailable: "ただいま休憩中です。",
    service_busy: "ただいま混み合っています。",
    service_not_configured: "ただいま準備中です。",
    upstream_unavailable: "お店情報を取得できませんでした。",
    upstream_invalid_response: "お店情報を確認できませんでした。",
    upstream_invalid_json: "お店情報を確認できませんでした。",
    upstream_invalid_schema: "お店情報を確認できませんでした。",
    upstream_api_error: "お店情報を取得できませんでした。",
    insufficient_candidates: "候補のお店を用意できませんでした。",
    internal_error: "ただいま休憩中です。"
  };
  const safeCode = Object.prototype.hasOwnProperty.call(messages, code)
    ? code : "internal_error";
  return detourJsonResponse_({
    ok: false,
    error: { code: safeCode, message: messages[safeCode] }
  });
}
