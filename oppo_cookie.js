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
const AUTO_APPEND = false; // 多账号自动追加改 true
const REQUIRE_APP_TOKEN = true; // APP Cookie 必须含有效 TOKENSID

const env = new Env(STORE_NAME);
const url = $request.url || "";
const headers = $request.headers || {};

const cookie = headers.Cookie || headers.cookie || "";
const userAgent = headers["User-Agent"] || headers["user-agent"] || "";

if (!/hd\.opposhop\.cn/.test(url) || !cookie) {
  env.done({});
}

const isMiniProgram = /MicroMessenger|miniProgram|MiniProgram/i.test(userAgent);

if (isMiniProgram) {
  saveValue("OPPO_MINI", cookie, "OPPO 商城小程序 Cookie 获取成功");
} else {
  if (REQUIRE_APP_TOKEN && !hasValidAppToken(cookie)) {
    console.log("[OPPO_APP] skip incomplete Cookie: TOKENSID/ENCODE_TOKENSID empty");
    env.done({});
  }

  const level = getAppLevel("OPPO_APP");
  const value = `${cookie}#${userAgent}#${level}`;
  saveValue("OPPO_APP", value, "OPPO 商城 APP Cookie 获取成功");
}

env.done({});

function hasValidAppToken(cookieValue) {
  return hasCookieValue(cookieValue, "TOKENSID", /^TOKEN_/) ||
    hasCookieValue(cookieValue, "ENCODE_TOKENSID", /^TOKEN_/);
}

function hasCookieValue(cookieValue, name, pattern) {
  const match = cookieValue.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return Boolean(match && pattern.test(match[1]));
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
