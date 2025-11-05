import twilio from "twilio";
import dotenv from "dotenv";
import { buildWhatsAppTemplate, buildSMSTemplate } from "./templates.js";

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOrderMessage = async (data) => {
  try {
    const { order, producer, to } = data;
    if (!order || !producer) throw new Error("Faltan datos del pedido o productor");

    const waBody = buildWhatsAppTemplate({ order, producer });
    const waTo = `whatsapp:${to.startsWith("+") ? to : `+57${to}`}`;
    const waFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

    const whatsappMsg = await client.messages.create({
      body: waBody,
      from: waFrom,
      to: waTo,
    });

    const smsBody = buildSMSTemplate({ order, producer });
    const smsTo = to.startsWith("+") ? to : `+57${to}`;
    const smsFrom = process.env.TWILIO_PHONE_NUMBER;

    const smsMsg = await client.messages.create({
      body: smsBody,
      from: smsFrom,
      to: smsTo,
    });

    return { whatsappMsg, smsMsg };

  } catch (err) {
    console.error(`Error enviando mensaje con Twilio: ${err.message}`);
    throw err;
  }
};