const TelegramBot = require('node-telegram-bot-api');
const mammoth = require("mammoth");
const OpenAI = require("openai");

// TELEGRAM
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// OPENAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// REGOLAMENTO
let rulesChunks = [];

// 1️⃣ CARICAMENTO + SPLIT INTELLIGENTE
async function loadRules() {

  const result = await mammoth.extractRawText({
    path: "rules.docx"
  });

  const text = result.value;

  // divide per paragrafi (IMPORTANTISSIMO)
  rulesChunks = text.split(/\n\s*\n/);

  console.log("Regolamento caricato e diviso in sezioni");

}

loadRules();


// 2️⃣ CERCA LA PARTE PIÙ RILEVANTE
function findRelevantChunks(question) {

  const q = question.toLowerCase();

  return rulesChunks
    .map(chunk => ({
      text: chunk,
      score: chunk.toLowerCase().includes(q) ? 2 :
             q.split(" ").some(w => chunk.toLowerCase().includes(w)) ? 1 : 0
    }))
    .filter(c => c.score > 0)
    .slice(0, 3) // max 3 sezioni
    .map(c => c.text)
    .join("\n\n");

}


// COMANDI BASE

bot.onText(/\/start/, (msg) => {

  bot.sendMessage(msg.chat.id,
`🤖 1st & Bot PRO online!

Assistente intelligente della lega.

Esempi:
- Quando chiude la trade deadline?
- Quanto dura un'asta?
- Penalità taglio?`
  );

});


bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot operativo");
});


// 3️⃣ AI + RAG

bot.on("message", async (msg) => {

  if (!msg.text) return;
  if (msg.text.startsWith("/")) return;

  const question = msg.text;

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
          content: "Sei 1st & Bot, assistente fantasy league. Rispondi SOLO con le info fornite. Sii chiaro e breve."
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
