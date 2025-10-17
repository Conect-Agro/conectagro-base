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

    res.send({ status: "ok", message: "User logged in", redirect: "/productor" });
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
  const { first_name_person, last_name_person, document_number_person, user_name, email_user, password } = req.body;
  const passwordhash = await bcryptjs.hash(password, 8);

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

    const queryRole = "SELECT role_id FROM roles WHERE role_name = 'cliente'";
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

        return res.status(201).json({
          status: "ok",
          message: "User registered successfully with role 'cliente'",
          redirect: "/",
        });
      });
    });
  });
}



export const methods = {
  login,
  saveRegister,
};
