import bcryptjs from "bcryptjs";
import connectiondb from "../database/database.js";
import jsonwebtoken from "jsonwebtoken";

async function login(req, res) {
  console.log(req.body);
  const user = req.body.user;
  const password = req.body.password;

  if (!user || !password) {
    return res.status(400).send({ status: "Error", message: "Missing fields" });
  }

  try {
    const userToReview = await getUserByUsername(user);
    if (!userToReview) {
      return res.status(400).send({ status: "Error", message: "Incorrect username or password" });
    }

    if (userToReview.login_attempts > 5) {
      await deactivateUser(user);
      return res.status(400).send({ status: "Error", message: "User blocked due to multiple failed attempts" });
    }

    if (userToReview.is_active == 0) { // ✓ usar userToReview que sí está definido
      return res.status(400).send({ status: "Error", message: "Inactive user" });
    }

    const loginCorrected = await bcryptjs.compare(password, userToReview.password_hash);
    if (!loginCorrected) {
      await incrementFailedAttempts(user);
      return res.status(400).send({ status: "Error", message: "Incorrect username or password" });
    }

    const token = generateToken(userToReview.username);
    setTokenCookie(res, token);
    await resetFailedAttempts(user);

    // Obtener el rol del usuario para redirigir correctamente
    const userRole = await getUserRole(userToReview.user_id);
    let redirectPath = "/client"; // Por defecto a cliente
    
    if (userRole && userRole.role_name === 'productor') {
      redirectPath = "/productor";
    }

    res.send({ status: "ok", message: "User logged in", redirect: redirectPath });
  } catch (error) {
    console.error("Error during login process:", error);
    res.status(500).send({ status: "Error", message: "Server error" });
  }
}

function getUserByUsername(user) {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM users WHERE username = ?";
    connectiondb.query(query, [user], (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result[0]);
    });
  });
}

function deactivateUser(user) {
  return new Promise((resolve, reject) => {
    const query = "UPDATE users SET is_active = 0 WHERE username = ?";
    connectiondb.query(query, [user], (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

function incrementFailedAttempts(user) {
  return new Promise((resolve, reject) => {
    const query = "UPDATE users SET login_attempts = login_attempts + 1 WHERE username = ?";
    connectiondb.query(query, [user], (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

function resetFailedAttempts(user) {
  return new Promise((resolve, reject) => {
    const query = "UPDATE users SET login_attempts = 0 WHERE username = ?";
    connectiondb.query(query, [user], (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

function generateToken(user) {
  return jsonwebtoken.sign(
    { user },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
}

function setTokenCookie(res, token) {
  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
    ),
    path: "/",
  };
  res.cookie("jwt", token, cookieOption);
}

async function saveRegister(req, res) {
  const { first_name_person, last_name_person, document_number_person, user_name, email_user, password, role, producer_data } = req.body;
  const passwordhash = await bcryptjs.hash(password, 8);
  const isProducer = role === 'productor';

  const queryUser = "INSERT INTO users SET ?";
    const valuesUser = {
      first_name: first_name_person,
      last_name: last_name_person,
      document_number: document_number_person,
      username: user_name,
      email: email_user,
      password_hash: passwordhash,
    };

    connectiondb.query(queryUser, valuesUser, (error, result) => {
      if (error) {
        console.error("Error in user registration:", error);

        if (error.code === "ER_DUP_ENTRY") {
          let field = "campo";
          if (error.sqlMessage.includes("username")) field = "nombre de usuario";
          if (error.sqlMessage.includes("email")) field = "correo electrónico";
          if (error.sqlMessage.includes("document_number")) field = "documento";

          return res
            .status(400)
            .json({ status: "Error", message: `El ${field} ya está en uso.` });
        }

        return res
          .status(500)
          .json({ status: "Error", message: "Error durante el registro." });
      }

      if (!result || !result.insertId) {
        console.error("User insertion failed, no insertId returned");
        return res
          .status(400)
          .json({ status: "Error", message: "No se pudo registrar el usuario." });
      }

      const userId = result.insertId;

    const roleName = isProducer ? 'productor' : 'cliente';
    const queryRole = `SELECT role_id FROM roles WHERE role_name = '${roleName}'`;
    connectiondb.query(queryRole, (error, roleResult) => {
      if (error || roleResult.length === 0) {
        console.error("Error fetching role:", error);
        return res.status(400).json({ status: "Error", message: "Error assigning role" });
      }

      const roleId = roleResult[0].role_id; 

      const queryUserRole = "INSERT INTO user_roles (role_id, user_id) VALUES (?, ?)";
      connectiondb.query(queryUserRole, [roleId, userId], (error) => {
        if (error) {
          console.error("Error assigning role:", error);
          return res.status(400).json({ status: "Error", message: "Error assigning role" });
        }

        // Si es productor, insertar datos adicionales en la tabla producers
        if (isProducer && producer_data) {
          const queryProducer = "INSERT INTO producers SET ?";
          const producerValues = {
            user_id: userId,
            farm_name: producer_data.farm_name,
            nit: producer_data.nit,
            location: producer_data.location,
            farm_size: producer_data.farm_size,
            production_type_id: producer_data.production_type_id,
            contact_phone: producer_data.contact_phone,
            contact_email: producer_data.contact_email
          };

          connectiondb.query(queryProducer, producerValues, (error) => {
            if (error) {
              console.error("Error saving producer data:", error);
              return res.status(400).json({ 
                status: "Error", 
                message: "Usuario creado pero error al guardar datos del productor" 
              });
            }

            return res.status(201).json({
              status: "ok",
              message: "Registro de productor exitoso. Ahora inicia sesión con tus credenciales",
              redirect: "/login",
            });
          });
        } else {
          return res.status(201).json({
            status: "ok",
            message: "Registro exitoso. Ahora inicia sesión con tus credenciales",
            redirect: "/login",
          });
        }
      });
    });
  });
}

function getUserRole(userId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT r.role_name 
      FROM roles r 
      JOIN user_roles ur ON r.role_id = ur.role_id 
      WHERE ur.user_id = ?
    `;
    connectiondb.query(query, [userId], (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result[0] || null);
      }
    });
  });
}

export const methods = {
  login,
  saveRegister,
};
