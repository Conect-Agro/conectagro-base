import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import connectiondb from "../database/database.js";

dotenv.config();

async function onlyProductor(req, res, next) {
  const login = await reviewCookie(req);
  if (login && login.roles.includes("productor")) return next();
  return res.redirect("/");
}

async function onlyClient(req, res, next) {
  const login = await reviewCookie(req);
  if (login && login.roles.includes("cliente")) return next();
  return res.redirect("/");
}

async function onlySuperAdmin(req, res, next) {
  const login = await reviewCookie(req);
  if (login && login.roles.includes("SuperAdmin")) return next();
  return res.redirect("/");
}

async function onlyPublic(req, res, next) {
  const login = await reviewCookie(req);
  if (!login) return next();
  if (login.roles.includes("SuperAdmin")) return res.redirect("/superAdmin");
  if (login.roles.includes("productor")) return res.redirect("/productor");
  if (login.roles.includes("cliente")) return res.redirect("/client");
  return res.redirect("/");
}

async function checkRole(req, res) {
  const login = await reviewCookie(req);
  const { role } = req.body;
  if (login && login.roles.includes(role)) {
    return res.json({ hasRole: true });
  }
  return res.json({ hasRole: false });
}

async function reviewCookie(req) {
  try {
    const cookieJWT = req.headers.cookie
      ?.split("; ")
      .find((cookie) => cookie.startsWith("jwt="))
      ?.slice(4);

    if (!cookieJWT) return false;

    const decoded = jwt.verify(cookieJWT, process.env.JWT_SECRET);
    console.log("Token decodificado:", decoded);

    return new Promise((resolve, reject) => {
      const query = `
SELECT u.username, GROUP_CONCAT(r.role_name) AS roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
WHERE u.username = ?
GROUP BY u.username
      `;
      connectiondb.query(query, [decoded.user], (error, result) => {
        if (error) {
          console.error("Error en la consulta SQL:", error);
          return reject(false);
        }
        if (result.length > 0) {
          result[0].roles = result[0].roles ? result[0].roles.split(",") : [];
          resolve(result[0]);
        } else {
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error("Error verificando cookie:", error);
    return false;
  }
}

async function authMiddleware(req, res, next) {
  try {
    const cookieJWT = req.headers.cookie
      ?.split("; ")
      .find((cookie) => cookie.startsWith("jwt="))
      ?.slice(4);

    if (!cookieJWT) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const decoded = jwt.verify(cookieJWT, process.env.JWT_SECRET);
    req.user = { user: decoded.user, id_user: decoded.id_user };
    next();
  } catch (error) {
    console.error("Error al verificar el token:", error);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

export const methods = {
  onlyProductor,
  onlyClient,
  onlySuperAdmin,
  onlyPublic,
  checkRole,
};

export { authMiddleware };