import twilio from "twilio";
import { buildOrderTemplate } from "./templates.js";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOrderMessage = async (data) => {
  try {
    if (!data?.order) {
      throw new Error("order is not defined");
    }

    const body = buildOrderTemplate(data);
    const to = process.env.CHANNEL === "whatsapp"
      ? `whatsapp:${data.to}`
      : data.to;
    const from = process.env.CHANNEL === "whatsapp"
      ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;

    const message = await client.messages.create({ body, from, to });
    return message;

  } catch (err) {
    console.error("Error enviando mensaje con Twilio:", err.message);
    throw err;
  }
};