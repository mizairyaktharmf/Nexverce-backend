/* ==========================================================
   ALLOW ONLY ADMINS
========================================================== */
export const allowAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admins only.",
    });
  }

  next();
};

/* ==========================================================
   ALLOW STAFF OR ADMIN
========================================================== */
export const allowStaffOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const allowed = ["admin", "staff"];

  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({
      message: "Access denied.",
    });
  }

  next();
};