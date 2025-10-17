import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config();

async function publishLowStock(product) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
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

  console.log(`Evento enviado: Producto bajo en stock → ${product.name}`);

  // No cerramos conexión si se usa regularmente
}

export { publishLowStock };
