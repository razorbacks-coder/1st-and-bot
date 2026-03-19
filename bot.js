const TelegramBot = require('node-telegram-bot-api');
const mammoth = require("mammoth");
const OpenAI = require("openai");

// ===== CONFIG =====
const token = process.env.BOT_TOKEN;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ⚠️ METTI QUI LO USERNAME DEL BOT (senza @)
const botUsername = "1st&Bot";

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

Scrivimi nel gruppo taggandomi:

@${botUsername} quanto dura un'asta?
`
  );
});

bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot operativo");
});

// ===== AUTO PRESENTAZIONE =====

bot.on("message", (msg) => {

  if (msg.new_chat_members) {

    msg.new_chat_members.forEach((member) => {

      if (member.username === botUsername) {

        bot.sendMessage(msg.chat.id,
`🤖 1st & Bot è entrato nella lega, merde!

Sono l’assistente ufficiale 🏈

📖 Posso aiutarvi con il regolamento, visto che da soli non ce la fate 
💡 Basta taggarmi!

Esempio:
@${botUsername} quanto dura un'asta?

⚠ Niente più discussioni infinite e inutili 😄`
        );

      }

    });

  }

});

// ===== AI + MENTION MODE =====

bot.on("message", async (msg) => {

  if (!msg.text) return;

  const text = msg.text;

  // risponde SOLO se taggato
  if (!text.toLowerCase().includes("@" + botUsername.toLowerCase())) {
    return;
  }

  // rimuove il tag
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
          content: "Sei 1st & Bot, assistente fantasy league. Rispondi SOLO usando le informazioni fornite. Sii chiaro e sintetico."
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
