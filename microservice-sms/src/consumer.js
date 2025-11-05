import amqp from "amqplib";
import { sendOrderMessage} from "./twilio.js";

export const startConsumer = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    const queue = "order-notifications";

    await channel.assertQueue(queue, { durable: true });

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());
        console.log("Pedido recibido:", data);

        try {
          await sendOrderMessage(data);
          console.log("Notificación enviada :DD");
        } catch (err) {
          console.error("Error:", err.message);
        }

        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error("Error iniciando consumidor:", err.message);
  }
};