(() => {
  "use strict";

  const REGIONS = Object.freeze({
    sapporo: Object.freeze({ label: "札幌", latitude: 43.0618, longitude: 141.3545 }),
    sendai: Object.freeze({ label: "仙台", latitude: 38.2682, longitude: 140.8694 }),
    tokyo: Object.freeze({ label: "東京", latitude: 35.6812, longitude: 139.7671 }),
    yokohama: Object.freeze({ label: "横浜", latitude: 35.4437, longitude: 139.6380 }),
    kawasaki: Object.freeze({ label: "川崎", latitude: 35.5308, longitude: 139.7029 }),
    shonan: Object.freeze({ label: "湘南", latitude: 35.3307, longitude: 139.4067 }),
    nagoya: Object.freeze({ label: "名古屋", latitude: 35.1709, longitude: 136.8815 }),
    osaka: Object.freeze({ label: "大阪", latitude: 34.6937, longitude: 135.5023 }),
    fukuoka: Object.freeze({ label: "福岡", latitude: 33.5904, longitude: 130.4017 }),
    naha: Object.freeze({ label: "那覇", latitude: 26.2124, longitude: 127.6809 })
  });

  const DEFAULT_REGION_KEY = "shonan";
  const STORAGE_KEY = "sharineko-weather-area";
  const API_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
  const REQUEST_TIMEOUT_MS = 10000;
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const LOADING_MESSAGE = "天気予報を確認しています…";
  const ERROR_MESSAGE = "天気予報はただいま毛づくろい中です。";

  const dom = {
    panel: document.getElementById("weather-panel"),
    area: document.getElementById("weather-area"),
    status: document.getElementById("weather-status"),
    result: document.getElementById("weather-result"),
    location: document.getElementById("weather-location"),
    icon: document.getElementById("weather-icon"),
    condition: document.getElementById("weather-condition"),
    currentTemperature: document.getElementById("weather-current-temp"),
    highTemperature: document.getElementById("weather-high-temp"),
    lowTemperature: document.getElementById("weather-low-temp"),
    precipitation: document.getElementById("weather-precipitation"),
    wind: document.getElementById("weather-wind"),
    comment: document.getElementById("weather-comment"),
    retry: document.getElementById("weather-retry"),
    attribution: document.getElementById("weather-attribution")
  };

  const requiredDom = Object.values(dom);
  const cache = new Map();
  let generation = 0;
  let activeRequest = null;

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isAllowedRegionKey(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(REGIONS, value);
  }

  function validateRegionData() {
    const keys = Object.keys(REGIONS);
    const labels = new Set();
    const coordinates = new Set();

    if (keys.length !== 10 || !isAllowedRegionKey(DEFAULT_REGION_KEY)) {
      return false;
    }

    for (const key of keys) {
      const region = REGIONS[key];
      if (!isPlainObject(region) || typeof region.label !== "string" || region.label.length === 0) {
        return false;
      }
      if (!Number.isFinite(region.latitude) || region.latitude < -90 || region.latitude > 90) {
        return false;
      }
      if (!Number.isFinite(region.longitude) || region.longitude < -180 || region.longitude > 180) {
        return false;
      }

      const coordinateKey = `${region.latitude},${region.longitude}`;
      if (labels.has(region.label) || coordinates.has(coordinateKey)) {
        return false;
      }
      labels.add(region.label);
      coordinates.add(coordinateKey);
    }

    return true;
  }

  function readStoredRegionKey() {
    try {
      const storage = window.localStorage;
      if (!storage || typeof storage.getItem !== "function") {
        return DEFAULT_REGION_KEY;
      }
      const stored = storage.getItem(STORAGE_KEY);
      return isAllowedRegionKey(stored) ? stored : DEFAULT_REGION_KEY;
    } catch (_error) {
      return DEFAULT_REGION_KEY;
    }
  }

  function storeRegionKey(regionKey) {
    if (!isAllowedRegionKey(regionKey)) {
      return;
    }
    try {
      const storage = window.localStorage;
      if (storage && typeof storage.setItem === "function") {
        storage.setItem(STORAGE_KEY, regionKey);
      }
    } catch (_error) {
      // Storageが利用できなくても、現在のページ内では選択を継続する。
    }
  }

  function weatherDetails(code) {
    if (typeof code !== "number" || !Number.isFinite(code) || !Number.isInteger(code)) {
      return { label: "天気情報あり", icon: "", comment: "本日の勤務形態を確認中です。" };
    }
    if (code === 0) {
      return { label: "晴れ", icon: "☀️", comment: "今日は窓辺で日向ぼっこ勤務です。" };
    }
    if (code === 1) {
      return { label: "おおむね晴れ", icon: "🌤️", comment: "日当たりのよい席で営業します。" };
    }
    if (code === 2) {
      return { label: "一部くもり", icon: "⛅", comment: "日差しを探しながら営業します。" };
    }
    if (code === 3) {
      return { label: "くもり", icon: "☁️", comment: "日差し待ちで通常営業です。" };
    }
    if (code === 45 || code === 48) {
      return { label: "霧", icon: "🌫️", comment: "見通し確認のため、窓辺で待機します。" };
    }
    if (code >= 51 && code <= 57) {
      return { label: "霧雨", icon: "🌦️", comment: "小雨のため、室内勤務です。" };
    }
    if (code >= 61 && code <= 67) {
      return { label: "雨", icon: "🌧️", comment: "本日は室内で毛づくろい中心です。" };
    }
    if (code >= 71 && code <= 77) {
      return { label: "雪", icon: "🌨️", comment: "暖房付近へ配置転換されました。" };
    }
    if (code >= 80 && code <= 82) {
      return { label: "にわか雨", icon: "🌦️", comment: "雨の合間に窓辺を確認します。" };
    }
    if (code === 85 || code === 86) {
      return { label: "にわか雪", icon: "🌨️", comment: "暖房付近で待機します。" };
    }
    if (code >= 95 && code <= 99) {
      return { label: "雷雨", icon: "⛈️", comment: "本日は安全確保を優先します。" };
    }
    return { label: "天気情報あり", icon: "", comment: "本日の勤務形態を確認中です。" };
  }

  function validDatePart(value, pattern) {
    if (typeof value !== "string" || !pattern.test(value)) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  function finiteOrNull(value) {
    return Number.isFinite(value) ? value : null;
  }

  function firstValue(values) {
    return Array.isArray(values) && values.length > 0 ? values[0] : undefined;
  }

  function validateResponse(payload) {
    if (!isPlainObject(payload) || payload.error === true || payload.timezone !== "Asia/Tokyo") {
      throw new Error("Invalid weather response");
    }
    if (!isPlainObject(payload.current) || !isPlainObject(payload.daily)) {
      throw new Error("Missing weather response sections");
    }

    const currentDate = validDatePart(
      payload.current.time,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
    );
    const dailyDate = validDatePart(firstValue(payload.daily.time), /^\d{4}-\d{2}-\d{2}$/);
    const currentWeatherCode = finiteOrNull(payload.current.weather_code);
    const dailyWeatherCode = finiteOrNull(firstValue(payload.daily.weather_code));
    const requiredDailyArrays = [
      payload.daily.time,
      payload.daily.weather_code,
      payload.daily.temperature_2m_max,
      payload.daily.temperature_2m_min,
      payload.daily.precipitation_probability_max
    ];

    if (requiredDailyArrays.some((values) => !Array.isArray(values) || values.length === 0)) {
      throw new Error("Missing daily weather values");
    }
    if (!currentDate || !dailyDate || currentDate !== dailyDate) {
      throw new Error("Weather dates do not match");
    }
    if (currentWeatherCode === null || dailyWeatherCode === null) {
      throw new Error("Missing weather code");
    }

    return {
      weatherCode: currentWeatherCode,
      currentTemperature: finiteOrNull(payload.current.temperature_2m),
      highTemperature: finiteOrNull(firstValue(payload.daily.temperature_2m_max)),
      lowTemperature: finiteOrNull(firstValue(payload.daily.temperature_2m_min)),
      precipitationProbability: finiteOrNull(firstValue(payload.daily.precipitation_probability_max)),
      windSpeed: finiteOrNull(payload.current.wind_speed_10m)
    };
  }

  function formatNumber(value, digits, unit) {
    if (value === null) {
      return "—";
    }
    return `${value.toFixed(digits)}${unit}`;
  }

  function createDisplayData(regionKey, weather) {
    const details = weatherDetails(weather.weatherCode);
    return Object.freeze({
      regionLabel: REGIONS[regionKey].label,
      condition: details.label,
      icon: details.icon,
      comment: details.comment,
      currentTemperature: formatNumber(
        weather.currentTemperature === null ? null : Math.round(weather.currentTemperature),
        0,
        "℃"
      ),
      highTemperature: formatNumber(
        weather.highTemperature === null ? null : Math.round(weather.highTemperature),
        0,
        "℃"
      ),
      lowTemperature: formatNumber(
        weather.lowTemperature === null ? null : Math.round(weather.lowTemperature),
        0,
        "℃"
      ),
      precipitationProbability: formatNumber(
        weather.precipitationProbability === null ? null : Math.round(weather.precipitationProbability),
        0,
        "%"
      ),
      windSpeed: formatNumber(
        weather.windSpeed === null ? null : Math.round(weather.windSpeed * 10) / 10,
        1,
        " m/s"
      )
    });
  }

  function buildApiUrl(regionKey) {
    const region = REGIONS[regionKey];
    const url = new URL(API_ENDPOINT);
    url.search = new URLSearchParams({
      latitude: String(region.latitude),
      longitude: String(region.longitude),
      current: "temperature_2m,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "Asia/Tokyo",
      forecast_days: "1",
      wind_speed_unit: "ms"
    }).toString();
    return url.toString();
  }

  function setRetryVisible(visible) {
    dom.retry.hidden = !visible;
    dom.retry.disabled = !visible;
  }

  function showLoading() {
    dom.status.textContent = LOADING_MESSAGE;
    dom.result.hidden = true;
    setRetryVisible(false);
  }

  function showFailure() {
    dom.status.textContent = ERROR_MESSAGE;
    dom.result.hidden = true;
    setRetryVisible(true);
  }

  function showWeather(displayData) {
    dom.location.textContent = displayData.regionLabel;
    dom.icon.textContent = displayData.icon;
    dom.condition.textContent = displayData.condition;
    dom.currentTemperature.textContent = displayData.currentTemperature;
    dom.highTemperature.textContent = displayData.highTemperature;
    dom.lowTemperature.textContent = displayData.lowTemperature;
    dom.precipitation.textContent = displayData.precipitationProbability;
    dom.wind.textContent = displayData.windSpeed;
    dom.comment.textContent = displayData.comment;
    dom.status.textContent = "";
    dom.result.hidden = false;
    setRetryVisible(false);
  }

  function cacheEntry(regionKey) {
    const entry = cache.get(regionKey);
    if (!entry || entry.expiresAt <= Date.now()) {
      cache.delete(regionKey);
      return null;
    }
    return entry;
  }

  async function loadWeather(regionKey, forceRefresh = false) {
    if (!isAllowedRegionKey(regionKey)) {
      regionKey = DEFAULT_REGION_KEY;
      dom.area.value = regionKey;
    }

    if (
      activeRequest &&
      activeRequest.regionKey === regionKey &&
      !activeRequest.controller.signal.aborted
    ) {
      return;
    }

    generation += 1;
    const requestGeneration = generation;

    if (activeRequest) {
      activeRequest.controller.abort();
      activeRequest = null;
    }

    const cached = forceRefresh ? null : cacheEntry(regionKey);
    if (cached) {
      showWeather(cached.displayData);
      return;
    }

    const controller = new AbortController();
    const request = { controller, generation: requestGeneration, regionKey, timedOut: false };
    activeRequest = request;
    showLoading();

    const timeoutId = window.setTimeout(() => {
      request.timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildApiUrl(regionKey), {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }
      const payload = await response.json();
      const weather = validateResponse(payload);
      const displayData = createDisplayData(regionKey, weather);

      if (requestGeneration !== generation || activeRequest !== request) {
        return;
      }

      cache.set(regionKey, {
        displayData,
        expiresAt: Date.now() + CACHE_TTL_MS
      });
      showWeather(displayData);
    } catch (error) {
      if (requestGeneration !== generation || activeRequest !== request) {
        return;
      }
      if (error && error.name === "AbortError" && !request.timedOut) {
        return;
      }
      showFailure();
    } finally {
      window.clearTimeout(timeoutId);
      if (requestGeneration === generation && activeRequest === request) {
        activeRequest = null;
      }
    }
  }

  function failSafely() {
    if (dom.result) {
      dom.result.hidden = true;
    }
    if (dom.retry) {
      dom.retry.hidden = true;
      dom.retry.disabled = true;
    }
    if (dom.status) {
      dom.status.textContent = ERROR_MESSAGE;
    }
  }

  if (requiredDom.some((element) => !element) || !validateRegionData()) {
    failSafely();
    return;
  }

  const initialRegionKey = readStoredRegionKey();
  dom.area.value = initialRegionKey;

  dom.area.addEventListener("change", () => {
    const selectedRegionKey = isAllowedRegionKey(dom.area.value)
      ? dom.area.value
      : DEFAULT_REGION_KEY;
    dom.area.value = selectedRegionKey;
    storeRegionKey(selectedRegionKey);
    void loadWeather(selectedRegionKey);
  });

  dom.retry.addEventListener("click", () => {
    if (dom.retry.disabled) {
      return;
    }
    setRetryVisible(false);
    void loadWeather(dom.area.value, true);
  });

  void loadWeather(initialRegionKey);
})();
