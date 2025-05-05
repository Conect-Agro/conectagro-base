import express from "express";
import cors from "cors";
import connectiondb from "./database/database.js";

const app = express();
const port = process.env.API_PORT || 3001; // Usar un puerto diferente para la API

app.use(cors());
app.use(express.json());

app.get("/api/users", (req, res) => {
  connectiondb.query(
    `
        SELECT 
            u.user_id, 
            u.username, 
            u.document_number, 
            u.email, 
            CONCAT(u.first_name, ' ', u.last_name) AS full_name, 
            IF(u.is_active = 1, 'Active', 'Inactive') AS user_status,
            GROUP_CONCAT(r.role_name) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE u.user_id NOT IN (
            SELECT ur.user_id 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.role_id 
            WHERE r.role_name = 'SuperAdmin'
        )
        GROUP BY u.user_id
    `,
    (error, results) => {
      if (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Database query error" });
        return;
      }

      results.forEach((row) => {
        if (!row.roles) {
          row.roles = "";
        }
      });

      res.json(results);
    }
  );
});

app.get("/api/roles", (req, res) => {
  connectiondb.query(
    `SELECT role_id, role_name FROM roles WHERE role_name != 'SuperAdmin'`,
    (error, results) => {
      if (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Database query error" });
        return;
      }

      res.json(results);
    }
  );
});

app.post("/api/users/:id/roles", (req, res) => {
  const userId = req.params.id;
  const roles = req.body.roles;
  connectiondb.query(
    `DELETE FROM user_roles WHERE user_id = ?`,
    [userId],
    (error) => {
      if (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Database query error" });
        return;
      }
      const values = roles.map((role) => [userId, role]);
      connectiondb.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ?`,
        [values],
        (error) => {
          if (error) {
            console.error("Database query error:", error);
            res.status(500).json({ error: "Database query error" });
            return;
          }
          res.json({ message: "Roles updated successfully" });
        }
      );
    }
  );
});

app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
