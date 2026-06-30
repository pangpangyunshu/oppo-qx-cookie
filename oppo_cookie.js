/*
OPPO 商城 APP / 小程序 Cookie 抓取

[rewrite_local]
^https:\/\/hd\.opposhop\.cn\/ url script-request-header https://raw.githubusercontent.com/pangpangyunshu/oppo-qx-cookie/main/oppo_cookie.js

[mitm]
hostname = hd.opposhop.cn

APP:
OPPO_APP=Cookie#User-Agent#会员等级

小程序:
OPPO_MINI=Cookie
*/

const STORE_NAME = "OPPO参数";
const DEFAULT_LEVEL = "普卡"; // 普卡 / 银卡会员 / 金钻会员
const LEVEL_PREF_KEY = "OPPO_APP_LEVEL";
const APP_COOKIE_JAR_KEY = "OPPO_APP_COOKIE_JAR";
const APP_TOKEN_TIME_KEY = "OPPO_APP_TOKEN_TIME";
const AUTO_APPEND = false; // 多账号自动追加改 true
const REQUIRE_APP_TOKEN = true; // APP Cookie 必须含有效 TOKENSID
const REQUIRE_FULL_APP_COOKIE = true; // APP Cookie 必须含关键字段
const TOKEN_MAX_AGE_MS = 30 * 60 * 1000;
const APP_COOKIE_ORDER = [
  "bd_vid",
  "experiment_id",
  "oppo_track_id",
  "sa_distinct_id",
  "sensorsdata2015jssdkcross",
  "uc",
  "um",
  "us",
  "ut",
  "utm_campaign",
  "utm_medium",
  "utm_source",
  "utm_term",
  "obus-track_117500_session",
  "otrack_jssdk_store",
  "ENCODE_TOKENSID",
  "TOKENSID",
  "apkPkg",
  "app_innerutm",
  "app_param",
  "app_utm",
  "referer",
  "s_channel",
  "s_version",
  "search_id",
  "source_type",
  "utm_chnl_back",
  "sajssdk_2015_cross_new_user",
  "otrack_jssdk_is_first_day"
];
const FULL_APP_COOKIE_KEYS = [
  "bd_vid",
  "experiment_id",
  "oppo_track_id",
  "sa_distinct_id",
  "sensorsdata2015jssdkcross",
  "uc",
  "um",
  "us",
  "ut",
  "utm_campaign",
  "utm_medium",
  "utm_source",
  "utm_term",
  "obus-track_117500_session",
  "otrack_jssdk_store",
  "ENCODE_TOKENSID",
  "TOKENSID",
  "apkPkg",
  "app_innerutm",
  "app_param",
  "app_utm",
  "s_channel",
  "s_version",
  "source_type",
  "utm_chnl_back"
];
const ALLOW_EMPTY_APP_COOKIE_KEYS = ["referer", "search_id"];

const env = new Env(STORE_NAME);
main();

function main() {
  const url = $request.url || "";
  const headers = $request.headers || {};

  const cookie = headers.Cookie || headers.cookie || "";
  const userAgent = headers["User-Agent"] || headers["user-agent"] || "";

  if (!/hd\.opposhop\.cn/.test(url) || !cookie) {
    return env.done({});
  }

  const isMiniProgram = /MicroMessenger|miniProgram|MiniProgram/i.test(userAgent);

  if (isMiniProgram) {
    saveValue("OPPO_MINI", cookie, "OPPO 商城小程序 Cookie 获取成功");
    return env.done({});
  }

  const incomingHasTokenName = hasCookieName(cookie, "TOKENSID") ||
    hasCookieName(cookie, "ENCODE_TOKENSID");
  const incomingHasValidToken = hasValidAppToken(cookie);
  if (incomingHasTokenName && !incomingHasValidToken) {
    clearAppCookieJar();
  }

  resetAppCookieJarIfTokenChanged(cookie);
  const mergedCookie = mergeCookieJar(APP_COOKIE_JAR_KEY, cookie);

  if (incomingHasValidToken) {
    $prefs.setValueForKey(String(Date.now()), APP_TOKEN_TIME_KEY);
  }

  const tokenReady = hasValidAppToken(mergedCookie) && isRecentAppToken();
  const missingKeys = missingFullAppCookieKeys(mergedCookie);
  const fullReady = !REQUIRE_FULL_APP_COOKIE || missingKeys.length === 0;
  const explicitEmptyToken = incomingHasTokenName && !incomingHasValidToken;

  if (REQUIRE_APP_TOKEN && (!tokenReady || explicitEmptyToken || !fullReady)) {
    console.log(`[OPPO_APP] cached Cookie fragment, waiting full Cookie. missing=${missingKeys.join(",")}`);
    return env.done({});
  }

  const level = getAppLevel("OPPO_APP");
  const value = `${mergedCookie}#${userAgent}#${level}`;
  saveValue("OPPO_APP", value, "OPPO 商城 APP Cookie 获取成功");
  return env.done({});
}

function mergeCookieJar(key, incomingCookie) {
  const oldCookie = $prefs.valueForKey(key) || "";
  const merged = mergeCookies(oldCookie, incomingCookie);
  $prefs.setValueForKey(merged, key);
  return merged;
}

function resetAppCookieJarIfTokenChanged(incomingCookie) {
  const incomingToken = getAppToken(incomingCookie);
  if (!incomingToken) {
    return;
  }

  const oldCookie = $prefs.valueForKey(APP_COOKIE_JAR_KEY) || "";
  const oldToken = getAppToken(oldCookie);
  if (oldToken && oldToken !== incomingToken) {
    $prefs.removeValueForKey(APP_COOKIE_JAR_KEY);
    $prefs.removeValueForKey(APP_TOKEN_TIME_KEY);
  }
}

function clearAppCookieJar() {
  $prefs.removeValueForKey(APP_COOKIE_JAR_KEY);
  $prefs.removeValueForKey(APP_TOKEN_TIME_KEY);
}

function getAppToken(cookieValue) {
  const map = cookieMap(cookieValue);
  return map.TOKENSID || map.ENCODE_TOKENSID || "";
}

function mergeCookies(oldCookie, incomingCookie) {
  const order = [];
  const jar = {};

  addCookiePairs(order, jar, parseCookie(oldCookie));
  addCookiePairs(order, jar, parseCookie(incomingCookie));

  return sortCookieNames(order)
    .map((name) => `${name}=${jar[name]}`)
    .join("; ");
}

function sortCookieNames(order) {
  const seen = {};
  const sorted = [];

  APP_COOKIE_ORDER.forEach((name) => {
    if (order.includes(name) && !seen[name]) {
      sorted.push(name);
      seen[name] = true;
    }
  });

  order.forEach((name) => {
    if (!seen[name]) {
      sorted.push(name);
      seen[name] = true;
    }
  });

  return sorted;
}

function addCookiePairs(order, jar, pairs) {
  for (const pair of pairs) {
    if (!pair.name) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(jar, pair.name)) {
      order.push(pair.name);
      jar[pair.name] = pair.value;
      continue;
    }

    if (pair.value !== "") {
      jar[pair.name] = pair.value;
    }
  }
}

function parseCookie(cookieValue) {
  return String(cookieValue || "")
    .split(";")
    .map((item) => {
      const trimmed = item.trim();
      const index = trimmed.indexOf("=");
      if (index < 0) {
        return { name: trimmed, value: "" };
      }

      return {
        name: trimmed.slice(0, index).trim(),
        value: trimmed.slice(index + 1).trim()
      };
    })
    .filter((pair) => pair.name);
}

function missingFullAppCookieKeys(cookieValue) {
  const map = cookieMap(cookieValue);
  return FULL_APP_COOKIE_KEYS.filter((name) => {
    if (!Object.prototype.hasOwnProperty.call(map, name)) {
      return true;
    }

    return map[name] === "" && !ALLOW_EMPTY_APP_COOKIE_KEYS.includes(name);
  });
}

function cookieMap(cookieValue) {
  const map = {};
  for (const pair of parseCookie(cookieValue)) {
    map[pair.name] = pair.value;
  }
  return map;
}

function hasValidAppToken(cookieValue) {
  return hasCookieValue(cookieValue, "TOKENSID", /^TOKEN_/) ||
    hasCookieValue(cookieValue, "ENCODE_TOKENSID", /^TOKEN_/);
}

function hasCookieName(cookieValue, name) {
  return new RegExp(`(?:^|;\\s*)${name}=`).test(cookieValue);
}

function hasCookieValue(cookieValue, name, pattern) {
  const match = cookieValue.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return Boolean(match && pattern.test(match[1]));
}

function isRecentAppToken() {
  const tokenTime = Number($prefs.valueForKey(APP_TOKEN_TIME_KEY) || 0);
  return tokenTime > 0 && Date.now() - tokenTime <= TOKEN_MAX_AGE_MS;
}

function getAppLevel(key) {
  const savedLevel = $prefs.valueForKey(LEVEL_PREF_KEY);
  if (isValidLevel(savedLevel)) {
    return savedLevel;
  }

  const oldValue = $prefs.valueForKey(key) || "";
  const oldLevel = oldValue.split("#").pop();
  if (isValidLevel(oldLevel)) {
    return oldLevel;
  }

  return DEFAULT_LEVEL;
}

function isValidLevel(level) {
  return ["普卡", "银卡会员", "金钻会员"].includes(level);
}

function saveValue(key, value, title) {
  const oldValue = $prefs.valueForKey(key) || "";
  let nextValue = value;

  if (AUTO_APPEND && oldValue) {
    const exists = oldValue.split("@").includes(value);
    nextValue = exists ? oldValue : `${oldValue}@${value}`;
  }

  if (oldValue !== nextValue) {
    $prefs.setValueForKey(nextValue, key);
  }

  env.notify(title, `变量名：${key}`, nextValue);
  console.log(`[${key}] ${nextValue}`);
}

function Env(name) {
  return {
    name,
    isQX: typeof $task !== "undefined",
    isSurge: typeof $network !== "undefined" && typeof $script !== "undefined",
    isLoon: typeof $loon !== "undefined",

    notify(title, subtitle, message) {
      const finalTitle = `[${this.name}] ${title}`;
      if (this.isQX) {
        $notify(finalTitle, subtitle, message);
      } else if (this.isSurge || this.isLoon) {
        $notification.post(finalTitle, subtitle, message);
      } else {
        console.log(`${finalTitle}\n${subtitle}\n${message}`);
      }
    },

    done(value = {}) {
      $done(value);
    }
  };
}
