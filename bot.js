const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const fs = require("fs");
const fetch = require("node-fetch");
const xml2js = require("xml2js");

// ===== CONFIG =====
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const LEAGUE_ID = "10241"; // <-- CAMBIA QUI

// ===== USERNAME =====
let botUsername = "";

bot.getMe().then(me => {
  botUsername = me.username;
  console.log("🤖 Bot username:", botUsername);
});

// ===== REGOLAMENTO =====
let regolamentoText = "";
let regolamentoChunks = [];

try {
  regolamentoText = fs.readFileSync("rules_clean.txt", "utf-8");
  regolamentoChunks = regolamentoText.split(/\n\s*\n/);
  console.log("📜 Regolamento caricato");
} catch (err) {
  console.error("❌ Errore regolamento:", err.message);
}

// ===== MEMORIA =====
const memory = {};
function getUserMemory(userId) {
  if (!memory[userId]) memory[userId] = [];
  return memory[userId];
}

// ===== MFL FETCH =====
async function getRosters() {
  const url = `https://api.myfantasyleague.com/2026/export?TYPE=rosters&L=${LEAGUE_ID}`;
  const res = await fetch(url);
  return await res.text();
}

async function getPlayers() {
  const url = `https://api.myfantasyleague.com/2026/export?TYPE=players`;
  const res = await fetch(url);
  return await res.text();
}

// ===== PARSING =====
async function parseXML(xml) {
  const parser = new xml2js.Parser();
  return await parser.parseStringPromise(xml);
}

// ===== TROVA GIOCATORE =====
async function findPlayer(name) {

  const xml = await getPlayers();
  const data = await parseXML(xml);

  const players = data.players.player;

  return players.find(p =>
    p.$.name.toLowerCase().includes(name.toLowerCase())
  );
}

// ===== TROVA CONTRATTO =====
async function findPlayerInRosters(playerId) {

  const xml = await getRosters();
  const data = await parseXML(xml);

  const franchises = data.league.franchises[0].franchise;
  const rosters = data.league.rosters[0].franchise;

  for (let team of rosters) {
    const players = team.player || [];

    for (let p of players) {
      if (p.$.id === playerId) {

        const franchise = franchises.find(f => f.$.id === team.$.id);

        return {
          team: franchise.$.name,
          salary: parseInt(p.$.salary || 1000),
          years: parseInt(p.$.contractYear || 1)
        };
      }
    }
  }

  return null;
}

// ===== CALCOLO TAG =====
function calculateTagCost(salary, years) {

  // semplice formula esempio (puoi cambiarla)
  return Math.round(salary * 1.2);
}

// ===== RICERCA REGOLAMENTO =====
function findRelevantChunks(question) {

  const words = question.toLowerCase().split(" ");

  let bestChunk = "";
  let bestScore = 0;

  for (let chunk of regolamentoChunks) {

    let score = 0;

    for (let w of words) {
      if (chunk.toLowerCase().includes(w)) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunk;
    }
  }

  return bestChunk;
}

// ===== AI =====
async function handleQuestion(msg, question) {

  const userId = msg.from.id;
  const context = findRelevantChunks(question);

  if (!context) {
    bot.sendMessage(msg.chat.id, "🤔 Non trovo info nel regolamento.");
    return;
  }

  const history = getUserMemory(userId);

  try {

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Rispondi SOLO usando il regolamento.

Formato:
🏈 REGOLA
🧠 SPIEGAZIONE
💡 CONSIGLIO
`
        },
        { role: "system", content: context },
        ...history,
        { role: "user", content: question }
      ]
    });

    const answer = response.choices[0].message.content;

    history.push({ role: "user", content: question });
    history.push({ role: "assistant", content: answer });

    if (history.length > 10) history.splice(0, 2);

    bot.sendMessage(msg.chat.id, answer);

  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, "⚠ errore AI");
  }
}

// ===== COMANDO TAG =====
bot.onText(/\/tag (.+)/, async (msg, match) => {

  const name = match[1];

  bot.sendMessage(msg.chat.id, "🔍 Cerco giocatore...");

  try {

    const player = await findPlayer(name);

    if (!player) {
      bot.sendMessage(msg.chat.id, "❌ Giocatore non trovato");
      return;
    }

    const info = await findPlayerInRosters(player.$.id);

    if (!info) {
      bot.sendMessage(msg.chat.id, "❌ Giocatore non a roster");
      return;
    }

    const tagCost = calculateTagCost(info.salary, info.years);

    bot.sendMessage(msg.chat.id,
`🏷️ TAG CALCOLATION

👤 ${player.$.name}
🏈 Team: ${info.team}

💰 Salario attuale: ${info.salary}
📅 Anni: ${info.years}

🔥 Tag stimato: ${tagCost}

💡 Tip:
valuta cap e durata prima di taggare`
    );

  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, "⚠ errore calcolo tag");
  }

});

// ===== LISTENER =====
bot.on("message", async (msg) => {

  if (!msg.text) return;

  const text = msg.text;

  let isMentioned = text.includes("@" + botUsername);

  const isReply =
    msg.reply_to_message &&
    msg.reply_to_message.from &&
    msg.reply_to_message.from.username === botUsername;

  if (!isMentioned && !isReply && msg.chat.type !== "private") return;

  const question = text.replace(new RegExp(`@${botUsername}`, "i"), "").trim();

  if (!question) return;

  handleQuestion(msg, question);

});
