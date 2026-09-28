import { adminOnly } from "./adminOnly.js";
import { teacherInfo } from "./teacherInfo.js";

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

export const adminOrTeacher = async (req, res, next) => {
  const hasAdminCred = Boolean(req.cookies?.adminToken || req.headers["x-admin-secret"]);
  const hasTeacherCred = Boolean(req.cookies?.teacherToken);

  if (!hasAdminCred && !hasTeacherCred) {
    return res.status(401).json({
      success: false,
      message: "Admin ya Teacher login zaroori hai.",
    });
  }

  if (hasAdminCred && (await attempt(adminOnly, req))) {
    req.actor = { type: "admin" };
    return next();
  }

  if (hasTeacherCred && (await attempt(teacherInfo, req))) {
    req.actor = { type: "teacher", teacherId: req.teacher._id, role: req.teacher.role };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "Session expire ho gaya hai. Admin ya Teacher login dobara karein.",
  });
};
