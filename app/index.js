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
import { methods as producersController } from "./controllers/producers.controller.js";
import { authMiddleware } from "./middlewares/authorization.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import prometheus from 'prom-client';
import dotenv from 'dotenv';
import connectiondb from './database/database.js';

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
app.use(express.json({ limit: '50mb' })); // Aumentar límite para imágenes Base64
app.use(express.urlencoded({ limit: '50mb', extended: true })); // También para urlencoded
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/landing.html'));
});

app.get('/login', authorization.onlyPublic, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/login.html'));
});

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

// API de tipos de producción
app.get("/api/production-types", (req, res) => {
  const query = "SELECT id, name, category, description FROM production_types WHERE is_active = 1 ORDER BY category, name";
  
  connectiondb.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching production types:", error);
      return res.status(500).json({ status: "Error", message: "Error al obtener tipos de producción" });
    }
    res.json(results);
  });
});

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

// API de productores (requieren autenticación y rol de productor)
app.get("/api/producer/profile", authMiddleware, authorization.onlyProductor, producersController.getProducerProfile);
app.put("/api/producer/profile", authMiddleware, authorization.onlyProductor, producersController.updateProducerProfile);
app.get("/api/producer/metrics", authMiddleware, authorization.onlyProductor, producersController.getDashboardMetrics);

// Gestión de productos del productor
app.get("/api/producer/products", authMiddleware, authorization.onlyProductor, producersController.getProducerProducts);
app.get("/api/producer/products/:productId", authMiddleware, authorization.onlyProductor, producersController.getProductById);
app.post("/api/producer/products", authMiddleware, authorization.onlyProductor, producersController.createProduct);
app.put("/api/producer/products/:productId", authMiddleware, authorization.onlyProductor, producersController.updateProduct);
app.delete("/api/producer/products/:productId", authMiddleware, authorization.onlyProductor, producersController.deleteProduct);

// Gestión de pedidos del productor
app.get("/api/producer/orders", authMiddleware, authorization.onlyProductor, producersController.getProducerOrders);
app.get("/api/producer/orders/:orderId", authMiddleware, authorization.onlyProductor, producersController.getOrderDetails);
app.put("/api/producer/orders/:orderId/status", authMiddleware, authorization.onlyProductor, producersController.updateOrderStatus);

// Notificaciones del productor
app.get("/api/producer/notifications", authMiddleware, authorization.onlyProductor, producersController.getNotifications);
app.put("/api/producer/notifications/read", authMiddleware, authorization.onlyProductor, producersController.markNotificationsAsRead);

// Endpoint para métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});