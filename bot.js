const TelegramBot = require('node-telegram-bot-api');
const mammoth = require("mammoth");
const axios = require("axios");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const apiKey = process.env.OPENROUTER_API_KEY;

let rulesText = "";

// carica regolamento
async function loadRules() {

  const result = await mammoth.extractRawText({
    path: "rules.docx"
  });

  rulesText = result.value;

  console.log("Regolamento caricato");

}

loadRules();


// START

bot.onText(/\/start/, (msg) => {

  bot.sendMessage(msg.chat.id,
`🤖 1st & Bot online!

Sono l'assistente della lega.

Puoi chiedermi qualsiasi cosa sul regolamento.

Esempi:
- Quando chiude la trade deadline?
- Quanto dura un'asta?
- Qual è la penalità per tagliare un giocatore?`
  );

});


bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id,"✅ Bot operativo");
});


// AI ASSISTANT

bot.on("message", async (msg) => {

  if (!msg.text) return;

  if (msg.text.startsWith("/")) return;

  const question = msg.text;

  try {

    const response = await axios.post(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    model: "mistralai/mistral-7b-instruct:free",
    messages: [
      {
        role: "system",
        content: "Sei l'assistente della fantasy football league. Rispondi usando solo il regolamento."
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
  },
  {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://railway.app",
      "X-Title": "1st & Bot"
    }
  }
);

    const answer = response.data.choices[0].message.content;

    bot.sendMessage(msg.chat.id, answer);

  } catch(err) {

    console.error(err);

    bot.sendMessage(msg.chat.id,"⚠ Errore AI");

  }

});
