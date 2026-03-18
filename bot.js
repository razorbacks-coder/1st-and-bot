const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🏈 1st & Bot online!");
});

bot.onText(/\/rules/, (msg) => {
  bot.sendMessage(msg.chat.id, "Chiedi pure qualcosa sul regolamento della lega.");
});

bot.on('message', (msg) => {
  if (msg.text.startsWith("/")) return;

  bot.sendMessage(msg.chat.id, "🤖 Sto ancora imparando, presto risponderò alle domande della lega!");
});