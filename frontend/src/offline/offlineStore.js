// offline/offlineStore.js
//
// Books aur notes ko app ke andar offline rakhne ka system.
//
// • Server se file ENCRYPTED aati hai (AES-GCM). Encrypted data IndexedDB mein
//   save hota hai — ye phone ke Downloads / File Manager mein nahi dikhta.
// • Chaabi (key) "non-extractable" CryptoKey ban kar save hoti hai: browser
//   isse decrypt to kar sakta hai, lekin JS bhi iske raw bytes bahar nahi
//   nikal sakta.
// • Har item ki permission 15 din chalti hai; online aate hi syncOffline()
//   use aage badha deta hai, ya access khatam ho gaya ho to item mita deta hai.
import api from "../api/api";

const DB_NAME = "antim-offline";
const DB_VERSION = 1;
const ITEMS = "items"; // metadata (title, expiry, key...)
const FILES = "files"; // encrypted data
const META = "meta"; // deviceId

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Is browser mein offline storage available nahi hai."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: "key" });
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
};

const run = async (stores, mode, fn) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    Promise.resolve(fn(tx)).then((r) => {
      result = r;
    });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Storage full ya band hai."));
  });
};

const reqToPromise = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const itemKey = (type, id) => `${type}:${id}`;

const randomId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const deviceLabel = () => {
  const ua = navigator.userAgent || "";
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "iPhone"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac/i.test(ua)
          ? "Mac"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
};

/** Is phone/browser ki pehchaan — pehli baar banti hai, phir wahi rehti hai. */
export const getDeviceId = async () => {
  let id = null;
  try {
    id = await run([META], "readonly", (tx) => reqToPromise(tx.objectStore(META).get("deviceId")));
  } catch {
    /* neeche localStorage se try */
  }
  if (!id) {
    try {
      id = localStorage.getItem("antim-device-id");
    } catch {
      /* ignore */
    }
  }
  if (!id) id = randomId();
  try {
    await run([META], "readwrite", (tx) => tx.objectStore(META).put(id, "deviceId"));
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem("antim-device-id", id);
  } catch {
    /* ignore */
  }
  return id;
};

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const header = (headers, name) => headers?.[name.toLowerCase()] ?? headers?.[name];
const decodeHeader = (v) => {
  try {
    return decodeURIComponent(v || "");
  } catch {
    return v || "";
  }
};

/** axios arraybuffer error ko normal JSON message mein badalta hai */
const parseErrorBody = (err) => {
  const data = err?.response?.data;
  if (data instanceof ArrayBuffer) {
    try {
      return JSON.parse(new TextDecoder().decode(data));
    } catch {
      return {};
    }
  }
  return data || {};
};

export class OfflineError extends Error {
  constructor(message, { code, status, devices } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.devices = devices;
  }
}

/** Server se item download karke encrypted form mein save karta hai. */
export const saveOffline = async (type, id) => {
  if (!crypto?.subtle) {
    throw new OfflineError("Offline reading ke liye app ko https par kholein.");
  }
  const deviceId = await getDeviceId();

  let res;
  try {
    res = await api.post(
      `/offline/${type}/${id}`,
      { deviceId, deviceLabel: deviceLabel() },
      { responseType: "arraybuffer", timeout: 120000 }
    );
  } catch (err) {
    const body = parseErrorBody(err);
    if (!err.response) throw new OfflineError("Internet nahi hai. Pehli baar download ke liye internet chahiye.", { code: "NETWORK" });
    throw new OfflineError(body.message || "Download nahi ho paya.", {
      code: body.code,
      status: err.response.status,
      devices: body.devices,
    });
  }

  const h = res.headers;
  const key = await crypto.subtle.importKey("raw", b64ToBytes(header(h, "x-offline-key")), "AES-GCM", false, ["decrypt"]);

  const item = {
    key: itemKey(type, id),
    type,
    id,
    title: decodeHeader(header(h, "x-offline-title")),
    subtitle: decodeHeader(header(h, "x-offline-subtitle")),
    watermark: decodeHeader(header(h, "x-offline-watermark")),
    licenseId: header(h, "x-offline-license"),
    expiresAt: header(h, "x-offline-expires"),
    iv: b64ToBytes(header(h, "x-offline-iv")),
    cryptoKey: key,
    size: res.data.byteLength,
    savedAt: new Date().toISOString(),
  };

  try {
    await run([ITEMS, FILES], "readwrite", (tx) => {
      tx.objectStore(FILES).put(res.data, item.key);
      tx.objectStore(ITEMS).put(item);
    });
  } catch {
    throw new OfflineError("Phone mein jagah kam hai. Kuch purani downloads delete karke try karein.", { code: "STORAGE" });
  }

  // Browser ko batao ki ye data zaroori hai — jagah kam hone par na mitaye
  navigator.storage?.persist?.().catch(() => {});
  return item;
};

export const listOffline = () =>
  run([ITEMS], "readonly", (tx) => reqToPromise(tx.objectStore(ITEMS).getAll())).then((items) =>
    (items || []).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
  );

export const getOfflineItem = (type, id) =>
  run([ITEMS], "readonly", (tx) => reqToPromise(tx.objectStore(ITEMS).get(itemKey(type, id))));

export const isExpired = (item) => !item?.expiresAt || new Date(item.expiresAt).getTime() < Date.now();

export const daysLeft = (item) =>
  Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

/** Decrypt karke PDF bytes deta hai (sirf memory mein — kahin save nahi hota). */
export const readOffline = async (type, id) => {
  const key = itemKey(type, id);
  const [item, cipher] = await run([ITEMS, FILES], "readonly", (tx) =>
    Promise.all([reqToPromise(tx.objectStore(ITEMS).get(key)), reqToPromise(tx.objectStore(FILES).get(key))])
  );
  if (!item || !cipher) throw new OfflineError("Ye item phone mein save nahi hai.", { code: "MISSING" });
  if (isExpired(item)) throw new OfflineError("Offline permission khatam ho gayi hai. Internet on karke dobara kholein.", { code: "EXPIRED" });

  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: item.iv }, item.cryptoKey, cipher);
  return { item, data: new Uint8Array(plain) };
};

export const removeOffline = (type, id) =>
  run([ITEMS, FILES], "readwrite", (tx) => {
    const key = itemKey(type, id);
    tx.objectStore(ITEMS).delete(key);
    tx.objectStore(FILES).delete(key);
  });

/** Logout par — is phone se saari offline books/notes hata do. */
export const clearAllOffline = async () => {
  try {
    await run([ITEMS, FILES], "readwrite", (tx) => {
      tx.objectStore(ITEMS).clear();
      tx.objectStore(FILES).clear();
    });
  } catch {
    /* storage hi nahi hai to kuch mitana bhi nahi */
  }
};

/**
 * Online hone par chalayein: har saved item ki permission 15 din aage badhti
 * hai, aur jinka access khatam ho gaya (batch chhoda, notes hata diye, phone
 * hataya) wo mita diye jaate hain.
 */
export const syncOffline = async () => {
  if (!navigator.onLine) return { synced: false };
  const items = await listOffline().catch(() => []);
  if (items.length === 0) return { synced: true, removed: 0 };

  const deviceId = await getDeviceId();
  let results;
  try {
    const res = await api.post("/offline/sync", { deviceId, licenseIds: items.map((i) => i.licenseId) });
    results = res.data.data || [];
  } catch {
    return { synced: false }; // login nahi hai / server down — offline copy jaisi hai waisi rahe
  }

  const byLicense = new Map(results.map((r) => [r.licenseId, r]));
  let removed = 0;
  for (const item of items) {
    const r = byLicense.get(item.licenseId);
    if (!r) continue;
    if (r.status === "revoked") {
      await removeOffline(item.type, item.id);
      removed += 1;
    } else if (r.expiresAt) {
      await run([ITEMS], "readwrite", (tx) => tx.objectStore(ITEMS).put({ ...item, expiresAt: r.expiresAt }));
    }
  }
  return { synced: true, removed };
};

export const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
