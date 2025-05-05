import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { methods as authentication } from "./controllers/authentication.controller.js";
import { emailHelper } from "./controllers/recoverPassword.controller.js";
import { methods as authorization } from "./middlewares/authorization.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import prometheus from 'prom-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server
const app = express();
const port = process.env.PORT || 3000;

app.set("port", port);
app.listen(app.get("port"), () => {
  console.log(`Server is running on port ${port}`);
});

// Configuration
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Crear un registro para las métricas
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
const Registry = prometheus.Registry;
const register = new Registry();

// Activa las métricas por defecto
collectDefaultMetrics({ register });

// Contador personalizado para peticiones HTTP
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

// Middleware para contar peticiones
app.use((req, res, next) => {
  const end = res.end;
  res.end = function() {
    httpRequestsTotal.inc({
      method: req.method, 
      path: req.path,
      status: res.statusCode
    });
    return end.apply(res, arguments);
  };
  next();
});

// Routes

app.get("/", authorization.onlyPublic, (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "login.html"))
);
app.get("/register", authorization.onlyPublic, (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "register.html"))
);
app.get("/superAdmin", authorization.onlySuperAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "superAdmin", "superAdmin.html"))
);
app.get("/productor", authorization.onlyProductor, (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "productor", "productor.html"))
);
app.get("/client", authorization.onlyClient, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "views", "client-dashboard.html"))
);
app.get("/recoverPassword", (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "recoverPassword.html"))
);
app.get("/accessDenied", (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "accessDenied.html"))
);

//New Route to check roles
app.post("/api/checkRole", authorization.checkRole);

app.get("/changePassword", (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "changePassword.html"))
);

app.post("/api/register", authentication.saveRegister);
app.post("/api/login", authentication.login);
app.post("/api/recoverPassword", emailHelper.sendEmail);
app.post("/api/changePassword", emailHelper.changePassword);

// Endpoint para métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
