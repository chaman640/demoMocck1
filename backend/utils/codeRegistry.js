// utils/codeRegistry.js
//
// Signup ke "code" box mein teen tarah ke code chalte hain — teacher ka batch
// code (Coupon), promoter code, aur student ka referral code. Teeno ek hi
// "namespace" mein hain, isliye koi bhi naya code teeno jagah unique hona
// chahiye. Yahan availability check aur suggestions ek jagah hain.
import crypto from "crypto";
import Coupon from "../models/Coupon.js";
import Promoter from "../models/Promoter.js";
import User from "../models/User.js";

export const CODE_RULE_TEXT = "4 se 12 akshar — sirf A-Z aur 0-9 (space ya symbol nahi)";
const CODE_REGEX = /^[A-Z0-9]{4,12}$/;
const RANDOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Aise code jo kisi ko nahi milne chahiye (confusion / impersonation)
const RESERVED = new Set(["ADMIN", "ANTIM", "ANTIMPRAYASH", "TEST", "FREE", "NULL", "UNDEFINED", "SUPPORT", "OFFICIAL"]);

export const normalizeCode = (raw) => String(raw ?? "").toUpperCase().replace(/\s+/g, "").trim();

export const validateCodeFormat = (code) => {
  if (!CODE_REGEX.test(code)) return `Code ${CODE_RULE_TEXT} hona chahiye.`;
  if (RESERVED.has(code)) return "Ye code reserved hai, koi aur chunein.";
  return null;
};

/** Code kahin bhi use ho raha hai? ignore = { promoterId } apna hi code ho to taken na maanein */
export const isCodeTaken = async (code, ignore = {}) => {
  if (RESERVED.has(code)) return true;
  const [coupon, promoter, user] = await Promise.all([
    Coupon.exists({ code }),
    Promoter.exists(ignore.promoterId ? { code, _id: { $ne: ignore.promoterId } } : { code }),
    User.exists({ referralCode: code }),
  ]);
  return Boolean(coupon || promoter || user);
};

const randomPart = (length) =>
  Array.from({ length }, () => RANDOM_CHARS[crypto.randomInt(RANDOM_CHARS.length)]).join("");

const initials = (text) =>
  String(text || "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 4);

/**
 * Jo code chaha tha wo na mile to milte-julte, available codes.
 * hint.exam (jaise "SSC GD") se "RAHULSG" jaise sujhav bhi bante hain.
 */
export const suggestCodes = async (wanted, hint = {}, count = 4) => {
  const base = normalizeCode(wanted).replace(/[^A-Z0-9]/g, "").slice(0, 9) || "CODE";
  const year = String(new Date().getFullYear()).slice(-2);
  const exam = initials(hint.exam);

  const candidates = [
    `${base}${year}`,
    exam ? `${base}${exam}` : null,
    `${base}${crypto.randomInt(10, 100)}`,
    `${base}${crypto.randomInt(100, 1000)}`,
    `${base.slice(0, 8)}${randomPart(2)}`,
    `${base}X`,
    `${base}${new Date().getFullYear()}`,
  ];

  const result = [];
  const seen = new Set();
  for (const c of candidates) {
    if (!c || seen.has(c) || validateCodeFormat(c)) continue;
    seen.add(c);
    if (!(await isCodeTaken(c))) result.push(c);
    if (result.length >= count) return result;
  }
  // Fallback — ab bhi kam hain to random
  for (let i = 0; i < 10 && result.length < count; i++) {
    const c = `${base.slice(0, 6)}${randomPart(3)}`;
    if (!seen.has(c) && !validateCodeFormat(c) && !(await isCodeTaken(c))) result.push(c);
    seen.add(c);
  }
  return result;
};

/** Naya unique random code (jab user ne khud kuch na chuna ho) */
export const generateUniqueCode = async (prefix = "", length = 8) => {
  const cleanPrefix = normalizeCode(prefix).replace(/[^A-Z0-9]/g, "").slice(0, Math.max(0, length - 3));
  for (let i = 0; i < 10; i++) {
    const code = `${cleanPrefix}${randomPart(length - cleanPrefix.length)}`;
    if (!validateCodeFormat(code) && !(await isCodeTaken(code))) return code;
  }
  return null;
};

/** Ek hi jagah se check: { ok, code } ya { ok: false, message, suggestions } */
export const checkRequestedCode = async (raw, hint = {}, ignore = {}) => {
  const code = normalizeCode(raw);
  const formatError = validateCodeFormat(code);
  if (formatError) return { ok: false, code, message: formatError, suggestions: [] };
  if (await isCodeTaken(code, ignore)) {
    return {
      ok: false,
      code,
      message: `'${code}' pehle se kisi ne le liya hai (unavailable).`,
      suggestions: await suggestCodes(code, hint),
    };
  }
  return { ok: true, code };
};
