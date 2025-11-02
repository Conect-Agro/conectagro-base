import mysql2 from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const connectiondb = mysql2.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 20000,
  acquireTimeout: 20000,
});

connectiondb.connect((error) => {
  if (error) {
    console.error("Connection error:", error);
    return;
  }
  console.log("Connected to the database!");
});

export default connectiondb;
