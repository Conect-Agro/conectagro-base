import express from "express";
import dotenv from "dotenv";
import { sendOrderMessage } from "./src/twilio.js";
import { startConsumer } from "./src/consumer.js";

dotenv.config();

const PORT = process.env.PORT;
const app = express();
app.use(express.json());

app.post("/enviar-mensaje", async (req, res) => {
  try {
    const { producer, order } = req.body;

    if (!producer || !order) {
      return res.status(400).json({ error: "Faltan datos del producer o order" });
    }

    console.log(`Enviando mensaje a ${producer.name} (${producer.phone})...`);

    const messageData = {
      to: producer.phone.startsWith("+") ? producer.phone : `+57${producer.phone}`,
      order,
      producer,
    };

    const result = await sendOrderMessage(messageData);

    res.status(200).json({
      success: true,
      messageId: result.sid,
      status: result.status,
    });

    console.log(`Mensaje enviado correctamente a ${producer.name}`);
  } catch (error) {
    console.error("Error en /enviar-mensaje:", error.message);
    res.status(500).json({ error: "Error enviando mensaje", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Microservicio SMS ejecutándose en el puerto ${PORT}`);
});

startConsumer?.();