    const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Token del bot de Telegram (debe estar en .env)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ID del chat o grupo donde enviar las notificaciones
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Verificar que las variables de entorno estén configuradas
if (!TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN no está configurado en .env');
  process.exit(1);
}

if (!TELEGRAM_CHAT_ID) {
  console.error('Error: TELEGRAM_CHAT_ID no está configurado en .env');
  process.exit(1);
}

// Crear instancia del bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

async function sendTelegramMessage(message) {
  try {
    console.log(`Enviando mensaje a Telegram (Chat ID: ${TELEGRAM_CHAT_ID})`);
    const response = await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
      parse_mode: 'Markdown'
    });
    return response;
  } catch (error) {
    console.error('Error enviando mensaje a Telegram:', error);
    throw error;
  }
}

module.exports = {
  sendTelegramMessage
};