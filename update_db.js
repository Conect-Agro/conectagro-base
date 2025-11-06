import mysql2 from "mysql2";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const connection = mysql2.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 20000,
  acquireTimeout: 20000,
});

const subscriptionTables = `
-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  delivery_day INT NOT NULL,
  subscription_type ENUM('monthly', 'biannual', 'annual') NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Tabla de productos de suscripción
CREATE TABLE IF NOT EXISTS subscription_products (
  subscription_product_id INT PRIMARY KEY AUTO_INCREMENT,
  subscription_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
`;

connection.connect((error) => {
  if (error) {
    console.error("Error conectando a la base de datos:", error);
    process.exit(1);
  }
  console.log("Conectado a la base de datos!");

  connection.query(subscriptionTables, (error, results) => {
    if (error) {
      console.error("Error creando las tablas:", error);
    } else {
      console.log("Tablas creadas exitosamente!");
    }
    
    connection.end((error) => {
      if (error) {
        console.error("Error al cerrar la conexión:", error);
      }
      console.log("Conexión cerrada.");
      process.exit(0);
    });
  });
});