import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config();

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    console.log("✅ Conectado a RabbitMQ");
    return channel;
  } catch (err) {
    console.error("❌ Error conectando a RabbitMQ:", err.message);
    setTimeout(connectRabbitMQ, 5000); // reintenta cada 5s
  }
}

export async function publishLowStock(product) {
  try {
    const channel = await connectRabbitMQ();
    if (!channel) return;

    const queue = "low_stock_alerts";
    await channel.assertQueue(queue, { durable: true });

    const message = {
      productId: product.id,
      name: product.name,
      stock: product.stock,
    };

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    console.log(`📦 Evento enviado: Producto bajo en stock → ${product.name}`);
  } catch (err) {
    console.error("❌ No se pudo publicar mensaje:", err.message);
  }
}
