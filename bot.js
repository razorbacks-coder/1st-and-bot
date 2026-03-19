const TelegramBot = require('node-telegram-bot-api');
const mammoth = require("mammoth");
const OpenAI = require("openai");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ⚠️ METTI QUI LO USERNAME DEL BOT (senza @)
const botUsername = "Firstanbot";

// ===== BOT =====
const bot = new TelegramBot(token, { polling: true });

// ===== REGOLAMENTO =====
let rulesChunks = [];

// carica e divide il regolamento
async function loadRules() {
  try {
    const result = await mammoth.extractRawText({
      path: "rules.docx"
    });

    const text = result.value;

    // divide in paragrafi
    rulesChunks = text.split(/\n\s*\n/);

    console.log("✅ Regolamento caricato");

  } catch (err) {
    console.error("❌ Errore regolamento:", err);
  }
}

loadRules();

// ===== CERCA PARTI RILEVANTI =====
function findRelevantChunks(question) {

  const q = question.toLowerCase();

  return rulesChunks
    .map(chunk => ({
      text: chunk,
      score:
        chunk.toLowerCase().includes(q) ? 2 :
        q.split(" ").some(w => chunk.toLowerCase().includes(w)) ? 1 : 0
    }))
    .filter(c => c.score > 0)
    .slice(0, 3)
    .map(c => c.text)
    .join("\n\n");

}

// ===== COMANDI =====

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🤖 1st & Bot PRO online!

Assistente della lega fantasy.

Taggami nel gruppo:

@${botUsername} quanto dura un'asta?
`
  );
});

bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot operativo");
});

// ===== AUTO PRESENTAZIONE =====

bot.getMe().then((me) => {

  bot.on("message", (msg) => {

    if (msg.new_chat_members) {

      msg.new_chat_members.forEach((member) => {

        if (member.id === me.id) {

          bot.sendMessage(msg.chat.id,
`🤖 1st & Bot è entrato nella lega, merde!

Sono l’assistente ufficiale 🏈

📖 Posso aiutarvi con il regolamento
💡 Basta taggarmi!

Esempio:
@${botUsername} quanto dura un'asta?

⚠ Niente più discussioni infinite e inutili 😄`
          );

        }

      });

    }

  });

});

// ===== AI + MENTION MODE (FIX TELEGRAM ENTITIES) =====

bot.on("message", async (msg) => {

  if (!msg.text) return;

  const text = msg.text;

  let isMentioned = false;

  // 🔥 controllo entities (mention + text_mention)
  if (msg.entities) {
    for (let e of msg.entities) {

      if (e.type === "mention") {
        const mention = text.substring(e.offset, e.offset + e.length);
        if (mention.toLowerCase() === "@" + botUsername.toLowerCase()) {
          isMentioned = true;
        }
      }

      if (e.type === "text_mention") {
        if (e.user && e.user.username && e.user.username.toLowerCase() === botUsername.toLowerCase()) {
          isMentioned = true;
        }
      }

    }
  }

  // 🔥 controllo reply al bot
  const isReplyToBot =
    msg.reply_to_message &&
    msg.reply_to_message.from &&
    msg.reply_to_message.from.username &&
    msg.reply_to_message.from.username.toLowerCase() === botUsername.toLowerCase();

  if (!isMentioned && !isReplyToBot) {
    return;
  }

  // pulizia testo (rimuove mention)
  const question = text.replace(new RegExp(`@${botUsername}`, "i"), "").trim();

  if (!question) {
    bot.sendMessage(msg.chat.id, "Dimmi qualcosa 😄");
    return;
  }

  const context = findRelevantChunks(question);

  if (!context) {
    bot.sendMessage(msg.chat.id, "❓ Non ho trovato info nel regolamento.");
    return;
  }

  try {

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sei 1st & Bot, assistente fantasy league. Rispondi SOLO usando le informazioni fornite."
        },
        {
          role: "system",
          content: context
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    const answer = response.choices[0].message.content;

    bot.sendMessage(msg.chat.id, answer);

  } catch (err) {

    console.error(err);

    bot.sendMessage(msg.chat.id, "⚠ Errore AI");

  }

});
