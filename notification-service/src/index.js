// 👇 Pequeño servidor HTTP para "engañar" a Render
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (_, res) => res.send('✅ Notification service is running.'));
app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});

// 👇 Tu lógica original
const { startConsumer } = require('./consumer');
const { sendTelegramMessage } = require('./telegram');

startConsumer(async (message) => {
  try {
    const product = JSON.parse(message.content.toString());
    
    // Fecha y hora formateadas
    const now = new Date();
    const dateTime = now.toLocaleString('es-PE');
    
    // Mensaje personalizado con emojis
    const telegramMessage = `👋 *Un saludo desde ConectAgro* 
¡Buenas noticias! Aún quedan algunas unidades del Producto: *${product.name}* (ID: ${product.productId || product.id}) 😁.
📦 Solo quedan *${product.stock}* en stock.
¡Apresúrate antes de que se agoten! 🔥

⏰ Fecha: ${dateTime}

ConectAgro Productos Frescos del Campo 🌱`;
    
    await sendTelegramMessage(telegramMessage);
    
    console.log(`Notificación enviada para: ${product.name}`);
    return true;
  } catch (error) {
    console.error('Error al procesar mensaje:', error);
    return false;
  }
});
