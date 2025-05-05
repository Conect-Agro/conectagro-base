import nodemailer from "nodemailer";
import bcryptjs from "bcryptjs";
import connectiondb from "../database/database.js";

async function sendEmail(req, res) {
  const email = req.body.email;
  try {
    const isExist = await getUserByEmail(email);
    if (!isExist) {
      return res.status(404).send({ status: "Error", message: "Incorrect username or password" });
    } else {
      const resetLink = "http://localhost:3000/changePassword";
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h1 style="text-align: center; color: #645bff;  font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 42px; font-weight: bold; margin-bottom: 20px;">Recuperación de Contraseña</h1>
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en <strong>APP-Login</strong>.</p>
        <p>Para continuar, haz clic en el siguiente enlace:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetLink}" 
            style="display: inline-block; padding: 15px 30px; background-color: #645bff; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
            Restablecer contraseña
          </a>
        </div>
        <p>Si no solicitaste este cambio,por favor comunícate con soporte técnico.</p>
        <p>Atentamente,</p>
        <p><strong>El equipo de soporte de APP-Login</strong></p>
      </div>
    `;
    let info = await sendTwoEmail(email, "Recover password APP-Login", message);
    res.status(200).send({ status: "Success", message: "Recover password" })
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send("Error sending email");
  }
}
async function sendTwoEmail(to, subject, htmlContent) {
  const userGmail = "kjulianapena1314@gmail.com";
  const passAppGmail = "wtgb sdzm ceum gqfz";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: userGmail,
      pass: passAppGmail,
    },
  });

  const mailOptions = {
    from: userGmail,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return { status: "ok", message: "Email sent successfully", info };
  } catch (error) {
    console.error("Error sending email:", error);
    return { status: "error", message: "Failed to send email", error };
  }
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT password_hash FROM users WHERE LOWER(email_user) = LOWER(?)";
    connectiondb.query(query, [email], (error, result) => {
      if (error) {
        reject(`Error al buscar usuario por email: ${error.message}`);
      } else {
        if (result.length > 0) { 
          resolve(true);
        } else {
          resolve(null);
        }
      }
    });
  });
}



async function changePassword(req, res) {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const isExist = await getUserByEmail(email);

    if (!isExist) {
      return res.status(404).send({ status: "Error", message: "Incorrect username" });
    } else if (typeof password !== "string" || !password.trim()) {
      return res.status(400).send({ status: "Error", message: "Invalid password" });
    } else {
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);
      await updateUserPassword(email, hashedPassword);
      res.status(200).send({ status: "Success", message: "Password changed successfully" });
      console.log(password);
    }

    
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}

function updateUserPassword(email, newPasswordHash) {
  return new Promise((resolve, reject) => {
    const query = "UPDATE users SET password_hash = ? WHERE email_user = ?";
    connectiondb.query(query, [newPasswordHash, email], (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

export const emailHelper = {
  sendEmail,
  changePassword,
};
