const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mammoth = require('mammoth');
const OpenAI = require("openai");
const fs = require("fs");

// TELEGRAM BOT
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
      path: "regolamento.docx"
    });

    rulesText = result.value;

    console.log("Regolamento caricato.");

  } catch(err) {

    console.error("Errore caricamento regolamento:", err);

  }
}

// carica regolamento all'avvio
loadRules();


// COMANDI BASE

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

  bot.sendMessage(msg.chat.id, "✅ 1st & Bot operativo");

});


// ASSISTENTE AI REGOLAMENTO

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
          content: "Sei 1st & Bot, l'assistente ufficiale di una fantasy football league. Rispondi solo usando il regolamento della lega."
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

  } catch(err) {

    console.error(err);

    bot.sendMessage(msg.chat.id,
      "⚠ Non sono riuscito a leggere il regolamento."
    );

  }

});
