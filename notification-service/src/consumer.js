const amqp = require('amqplib');
require('dotenv').config();

// URL de conexión a RabbitMQ (desde variables de entorno o valor por defecto)
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://user:password@rabbitmq:5672';
// En consumer.js
const QUEUE_NAME = process.env.RABBITMQ_QUEUE_NAME || 'low_stock_alerts';


async function startConsumer(messageHandler) {
  let connection;
  let channel;
  
  try {
    // Conectar a RabbitMQ
    console.log(`Conectando a RabbitMQ: ${RABBITMQ_URL}`);
    connection = await amqp.connect(RABBITMQ_URL);
    
    // Manejar cierre de conexión
    connection.on('close', () => {
      console.error('Conexión a RabbitMQ cerrada. Intentando reconectar en 5 segundos...');
      setTimeout(() => startConsumer(messageHandler), 5000);
    });
    
    // Crear canal
    channel = await connection.createChannel();
    
    // Asegurar que la cola existe
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    console.log(`Esperando mensajes de la cola ${QUEUE_NAME}...`);
    
    // Configurar consumidor
    channel.consume(QUEUE_NAME, async (message) => {
      if (!message) return;
      
      console.log(`Mensaje recibido: ${message.content.toString()}`);
      
      try {
        // Procesar mensaje con el handler
        const success = await messageHandler(message);
        
        if (success) {
          // Confirmar procesamiento exitoso
          channel.ack(message);
        } else {
          // Rechazar mensaje para reprocesamiento
          channel.nack(message, false, true);
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
        // Rechazar mensaje para reprocesamiento
        channel.nack(message, false, true);
      }
    });
  } catch (error) {
    console.error('Error en el consumidor:', error);
    
    // Cerrar conexiones si existen
    if (channel) await channel.close();
    if (connection) await connection.close();
    
    // Reintentar conexión después de un tiempo
    console.log('Intentando reconectar en 5 segundos...');
    setTimeout(() => startConsumer(messageHandler), 5000);
  }
}

module.exports = {
  startConsumer
};