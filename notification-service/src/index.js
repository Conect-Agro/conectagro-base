// 👇 Servidor HTTP para mantener el servicio activo en Render
const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Endpoint principal
app.get("/", (_, res) => {
  res.json({
    status: "✅ Notification service is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Endpoint de salud
app.get("/health", (_, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "notification-service",
    version: "1.0.0"
  });
});

// Endpoint de métricas
app.get("/metrics", (_, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express escuchando en el puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// 👇 Tu lógica original
const { startConsumer } = require("./consumer");
const { sendTelegramMessage } = require("./telegram");
const KeepAliveService = require("./keepAlive");

// 👇 Configurar keep-alive si estamos en producción (Render)
if (process.env.NODE_ENV === 'production' && process.env.RENDER_SERVICE_URL) {
  const keepAlive = new KeepAliveService(
    process.env.RENDER_SERVICE_URL + '/health',
    4 * 60 * 1000 // Ping cada 4 minutos
  );
  
  // Esperar un poco antes de iniciar el keep-alive
  setTimeout(() => {
    keepAlive.start();
  }, 30000); // 30 segundos de espera
}

startConsumer(async (message) => {
  try {
    const product = JSON.parse(message.content.toString());

    // Fecha y hora formateadas para Colombia
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateTime = formatter.format(now);

    // Mensaje personalizado con emojis
    const telegramMessage = `👋 *Un saludo desde ConectAgro* 
¡Buenas noticias! Aún quedan algunas unidades del Producto: *${
      product.name
    }* (ID: ${product.productId || product.id}) 😁.
📦 Solo quedan *${product.stock}* en stock.
¡Apresúrate antes de que se agoten! 🔥

⏰ Fecha: ${dateTime}

ConectAgro Productos Frescos del Campo 🌱`;

    await sendTelegramMessage(telegramMessage);

    console.log(`Notificación enviada para: ${product.name}`);
    return true;
  } catch (error) {
    console.error("Error al procesar mensaje:", error);
    return false;
  }
});
