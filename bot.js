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


const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const leagueId = "36353";
const season = "2026";
const week = "1";

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🏈 1st & Bot online!");
});

bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "Bot online ✅");
});


/* MATCHUPS */

bot.onText(/\/matchups/, async (msg) => {

  try {

    const url = `https://api.myfantasyleague.com/${season}/export?TYPE=matchups&L=${leagueId}&W=${week}`;

    const res = await axios.get(url);

    const matchups = res.data.matchups.matchup;

    let message = `🏈 WEEK ${week} MATCHUPS\n\n`;

    matchups.forEach(m => {

      const t1 = m.franchise[0].name;
      const t2 = m.franchise[1].name;

      message += `${t1} vs ${t2}\n`;

    });

    bot.sendMessage(msg.chat.id, message);

  } catch (err) {

    bot.sendMessage(msg.chat.id, "Errore nel recupero dei matchup");

  }

});


/* STANDINGS */

bot.onText(/\/standings/, async (msg) => {

  try {

    const url = `https://api.myfantasyleague.com/${season}/export?TYPE=standings&L=${leagueId}`;

    const res = await axios.get(url);

    const teams = res.data.standings.franchise;

    let message = "📊 STANDINGS\n\n";

    teams.forEach(t => {

      message += `${t.name} (${t.h2hw}-${t.h2hl})\n`;

    });

    bot.sendMessage(msg.chat.id, message);

  } catch (err) {

    bot.sendMessage(msg.chat.id, "Errore nel recupero standings");

  }

});