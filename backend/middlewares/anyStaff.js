// middlewares/anyStaff.js
// Teacher, promoter ya admin — teeno mein se koi bhi logged in ho to aage
// badhne do (jaise code availability check ke liye).
import { adminOnly } from "./adminOnly.js";
import { teacherInfo } from "./teacherInfo.js";
import { promoterInfo } from "./promoterInfo.js";

const attempt = (middleware, req) =>
  new Promise((resolve) => {
    const probe = {
      status() {
        return probe;
      },
      json() {
        resolve(false);
        return probe;
      },
    };
    Promise.resolve(middleware(req, probe, () => resolve(true))).catch(() => resolve(false));
  });

export const anyStaff = async (req, res, next) => {
  if (req.cookies?.teacherToken && (await attempt(teacherInfo, req))) return next();
  if (req.cookies?.promoterToken && (await attempt(promoterInfo, req))) return next();
  if ((req.cookies?.adminToken || req.headers["x-admin-secret"]) && (await attempt(adminOnly, req))) return next();
  return res.status(401).json({ success: false, message: "Teacher, promoter or admin login required." });
};
