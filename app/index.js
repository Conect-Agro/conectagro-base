import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { methods as authentication } from "./controllers/authentication.controller.js";
import { emailHelper } from "./controllers/recoverPassword.controller.js";
import { methods as authorization } from "./middlewares/authorization.js";
import { methods as productsController } from "./controllers/products.controller.js";
import { methods as cartController } from "./controllers/cart.controller.js";
import { methods as addressesController } from "./controllers/addresses.controller.js";
import { methods as ordersController } from "./controllers/orders.controller.js";
import { authMiddleware } from "./middlewares/authorization.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import prometheus from 'prom-client';
import dotenv from 'dotenv';

dotenv.config();

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
app.get("/checkout", authorization.onlyClient, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "views", "checkout.html"))
);
app.get("/orders", authorization.onlyClient, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "views", "orders.html"))
);
app.get("/order-details/:orderId", authMiddleware, authorization.onlyClient, authorization.verifyOrderOwnership, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "views", "order-details.html"))
);

// Ruta para cerrar sesión
app.get("/logout", (req, res) => {
  // Eliminar la cookie JWT
  res.clearCookie("jwt");
  // Redireccionar a la página de login
  res.redirect("/");
});

//New Route to check roles
app.post("/api/checkRole", authorization.checkRole);

app.get("/changePassword", (req, res) =>
  res.sendFile(path.join(__dirname, "pages", "changePassword.html"))
);

app.post("/api/register", authentication.saveRegister);
app.post("/api/login", authentication.login);
app.post("/api/recoverPassword", emailHelper.sendEmail);
app.post("/api/changePassword", emailHelper.changePassword);

// API de productos
app.get("/api/categories", productsController.getAllCategories);
app.get("/api/products", productsController.getAllProducts);
app.get("/api/products/category/:categoryId", productsController.getProductsByCategory);
app.get("/api/products/featured", productsController.getFeaturedProducts);
app.get("/api/products/search", productsController.searchProducts);

// API de carrito (requieren autenticación)
app.get("/api/cart", authMiddleware, cartController.getCartItems);
app.post("/api/cart", authMiddleware, cartController.addToCart);
app.put("/api/cart", authMiddleware, cartController.updateCartItem);
app.delete("/api/cart/:productId", authMiddleware, cartController.removeFromCart);
app.delete("/api/cart", authMiddleware, cartController.clearCart);

// API de direcciones (requieren autenticación)
app.get("/api/addresses", authMiddleware, addressesController.getUserAddresses);
app.post("/api/addresses", authMiddleware, addressesController.addAddress);
app.put("/api/addresses/:addressId/default", authMiddleware, addressesController.setDefaultAddress);
app.delete("/api/addresses/:addressId", authMiddleware, addressesController.deleteAddress);

// API de pedidos (requieren autenticación)
app.post("/api/orders", authMiddleware, ordersController.createOrder);
app.get("/api/orders", authMiddleware, ordersController.getUserOrders);
app.get("/api/orders/:orderId", authMiddleware, authorization.verifyOrderOwnership, ordersController.getOrderDetails);

// Endpoint para métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});