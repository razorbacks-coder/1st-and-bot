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
let rulesText = "";

async function loadRules() {
  try {
    const result = await mammoth.extractRawText({
      path: "rules.docx"
    });

    rulesText = result.value;

    console.log("Regolamento caricato");

  } catch (err) {
    console.error("Errore regolamento:", err);
  }
}

loadRules();


// COMANDI

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🤖 1st & Bot online!

Sono l'assistente della lega.

Chiedimi qualsiasi cosa sul regolamento.

Esempi:
- Quando chiude la trade deadline?
- Quanto dura un'asta?
- Penalità taglio giocatore?`
  );
});

bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot operativo");
});


// AI ASSISTANT

bot.on("message", async (msg) => {

  if (!msg.text) return;
  if (msg.text.startsWith("/")) return;

  const question = msg.text;

  try {

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sei 1st & Bot, assistente della fantasy league. Rispondi SOLO usando il regolamento. Se non trovi la risposta, dillo chiaramente."
        },
        {
          role: "system",
          content: rulesText
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
