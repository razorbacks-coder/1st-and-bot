const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const mammoth = require("mammoth");

// ===== CONFIG =====
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== USERNAME BOT =====
let botUsername = "";

bot.getMe().then(me => {
  botUsername = me.username;
  console.log("🤖 Bot username:", botUsername);
});

// ===== CARICAMENTO DOCX =====
let regolamentoText = "";
let regolamentoChunks = [];

async function loadDocx() {
  try {

    const result = await mammoth.extractRawText({
      path: "rules.docx"
    });

    regolamentoText = result.value;

    console.log("📜 Regolamento DOCX caricato");

    regolamentoChunks = splitRegolamento(regolamentoText);

  } catch (err) {
    console.error("❌ Errore lettura DOCX:", err.message);
  }
}

loadDocx();

// ===== PARSING =====
function splitRegolamento(text) {

  const chunks = text.split(/\n\s*\n/);

  return chunks.filter(c => c.length > 50);

}

// ===== MEMORIA =====
const memory = {};

function getUserMemory(userId) {
  if (!memory[userId]) {
    memory[userId] = [];
  }
  return memory[userId];
}

// ===== RICERCA =====
function findRelevantChunks(question) {

  const words = question.toLowerCase().split(" ");

  let bestChunks = [];
  let bestScore = 0;

  for (let chunk of regolamentoChunks) {

    let score = 0;

    for (let w of words) {
      if (chunk.toLowerCase().includes(w)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestChunks = [chunk];
    }

  }

  return bestChunks.join("\n");

}

// ===== GESTIONE DOMANDA =====
async function handleQuestion(msg, question) {

  const userId = msg.from.id;

  const context = findRelevantChunks(question);

  if (!context || context.length < 20) {
    bot.sendMessage(msg.chat.id, "🤔 Non trovo questa informazione nel regolamento. Prova a riformulare.");
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
Sei 1st & Bot, assistente della fantasy league.

Rispondi SOLO usando il regolamento fornito.

Formato risposta:
📜 Regola:
(spiegazione dal regolamento)

🧠 Spiegazione:
(spiegazione semplice)

Se non sei sicuro, dillo chiaramente.
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

    if (history.length > 10) {
      history.splice(0, 2);
    }

    bot.sendMessage(msg.chat.id, answer);

  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, "⚠ Errore AI");
  }

}

// ===== AUTO INTRO =====
bot.on("new_chat_members", (msg) => {

  msg.new_chat_members.forEach(user => {

    if (user.username === botUsername) {

      bot.sendMessage(msg.chat.id,
`🤖 1st & Bot online!

Sono l'assistente della lega 🏈

Taggami oppure rispondi a un mio messaggio.

Esempi:
- quanto dura un'asta?
- trade deadline?
- penalità taglio?`
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

      if (e.type === "text_mention") {
        if (e.user && e.user.username === botUsername) {
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

  if (!isMentioned && !isReply && msg.chat.type !== "private") {
    return;
  }

  const question = text.replace(new RegExp(`@${botUsername}`, "i"), "").trim();

  if (!question) {
    bot.sendMessage(msg.chat.id, "Dimmi qualcosa 😄");
    return;
  }

  handleQuestion(msg, question);

});
