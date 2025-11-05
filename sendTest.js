import dotenv from "dotenv";
import { methods } from "./app/controllers/orders.controller.js";

dotenv.config();

(async () => {
  try {
    const orderId = 23;
    console.log(`🚀 Probando envío de notificaciones para el pedido #${orderId}...\n`);
    await methods.sendOrderSummaryToProducers(orderId);
    console.log("\n✅ Prueba completada correctamente");
  } catch (error) {
    console.error("❌ Error durante la prueba:", error);
  }
})();