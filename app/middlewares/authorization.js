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
    
    // Obtener información adicional del usuario
    connectiondb.query(
      `SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, 
              GROUP_CONCAT(r.role_name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = ?
       GROUP BY u.user_id`,
      [decoded.id_user],
      (error, results) => {
        if (error) {
          console.error("Error obteniendo información del usuario:", error);
          return res.status(500).json({ message: "Error del servidor" });
        }
        
        if (results.length === 0) {
          return res.status(401).json({ message: "Usuario no encontrado" });
        }
        
        const userInfo = results[0];
        req.user = {
          id_user: userInfo.user_id,
          user: userInfo.username,
          email: userInfo.email,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          roles: userInfo.roles ? userInfo.roles.split(",") : []
        };
        
        next();
      }
    );
  } catch (error) {
    console.error("Error al verificar el token:", error);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

async function verifyOrderOwnership(req, res, next) {
  try {
    const userId = req.user.id_user;
    const orderId = req.params.orderId;
    
    connectiondb.query(
      "SELECT * FROM orders WHERE order_id = ? AND user_id = ?",
      [orderId, userId],
      (error, results) => {
        if (error) {
          console.error("Error verificando propiedad de orden:", error);
          return res.status(500).json({ error: "Error del servidor" });
        }
        
        if (results.length === 0) {
          return res.status(403).json({ error: "No tienes permiso para ver esta orden" });
        }
        
        next();
      }
    );
  } catch (error) {
    console.error("Error en verificación de propiedad:", error);
    return res.status(500).json({ error: "Error del servidor" });
  }
}

export const methods = {
  onlyProductor,
  onlyClient,
  onlySuperAdmin,
  onlyPublic,
  checkRole,
  verifyOrderOwnership
};

export { authMiddleware };