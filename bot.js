const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const fs = require("fs");

// ===== CONFIG =====
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== USERNAME =====
let botUsername = "";

bot.getMe().then(me => {
  botUsername = me.username;
  console.log("🤖 Bot username:", botUsername);
});

// ===== CARICAMENTO REGOLAMENTO TXT =====
let regolamentoText = "";
let regolamentoChunks = [];

try {
  regolamentoText = fs.readFileSync("rules.txt", "utf-8");
  console.log("📜 Regolamento caricato");

  regolamentoChunks = regolamentoText.split(/\n\s*\n/);

} catch (err) {
  console.error("❌ Errore caricamento regolamento:", err.message);
}

// ===== MEMORIA =====
const memory = {};

function getUserMemory(userId) {
  if (!memory[userId]) memory[userId] = [];
  return memory[userId];
}

// ===== RICERCA SEMPLICE =====
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

// ===== RISPOSTA =====
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
Sei 1st & Bot, assistente fantasy football.

Rispondi SOLO usando il regolamento.

Formato OBBLIGATORIO:

🏈 REGOLA
(spiegazione breve)

🧠 SPIEGAZIONE
(spiegazione semplice)

💡 CONSIGLIO
(consiglio pratico strategico)

Se non sei sicuro → dillo chiaramente.
`
        },
        {
          role: "system",
          content: context
        },
        ...history,
        {
          role: "user",
          content: question
        }
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

// ===== AUTO INTRO =====
bot.on("new_chat_members", (msg) => {

  msg.new_chat_members.forEach(user => {

    if (user.username === botUsername) {

      bot.sendMessage(msg.chat.id,
`🤖 1st & Bot ONLINE

Sono l’assistente ufficiale della lega 🏈

Chiedimi:
- aste
- tagli
- trade
- cap
- regolamento

Taggami oppure rispondi a un mio messaggio 👇`
      );

    }

  });

});

// ===== LISTENER =====
bot.on("message", async (msg) => {

  if (!msg.text) return;

  const text = msg.text;

  let isMentioned = false;

  if (msg.entities) {
    for (let e of msg.entities) {
      if (e.type === "mention") {
        const mention = text.substring(e.offset, e.offset + e.length);
        if (mention.toLowerCase() === "@" + botUsername.toLowerCase()) {
          isMentioned = true;
        }
      }
    }
  }

  if (text.toLowerCase().includes("@" + botUsername.toLowerCase())) {
    isMentioned = true;
  }

  const isReply =
    msg.reply_to_message &&
    msg.reply_to_message.from &&
    msg.reply_to_message.from.username === botUsername;

  if (!isMentioned && !isReply && msg.chat.type !== "private") return;

  const question = text.replace(new RegExp(`@${botUsername}`, "i"), "").trim();

  if (!question) {
    bot.sendMessage(msg.chat.id, "Scrivi qualcosa 😄");
    return;
  }

  handleQuestion(msg, question);

});
