import mysql2 from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 🧠 Obtener la ruta absoluta al archivo .env en la raíz
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");

console.log("Intentando cargar .env desde:", envPath);

dotenv.config({ path: envPath });

// Para confirmar qué se está leyendo:
console.log("DB_HOST leído desde .env:", process.env.DB_HOST);

const connectiondb = mysql2.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connectiondb.connect((error) => {
  if (error) {
    console.error("Connection error:", error);
    return;
  }
  console.log("Connected to the database!");
});

export default connectiondb;
