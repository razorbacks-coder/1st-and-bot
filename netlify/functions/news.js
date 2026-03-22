const fetch = require("node-fetch");

exports.handler = async function () {

  try {

    const res = await fetch("https://api.sleeper.app/v1/news", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const text = await res.text();

    // debug
    console.log("RESPONSE:", text.substring(0, 200));

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Non JSON (bloccato da Sleeper)");
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(data)
    };

  } catch (err) {

    console.error("🔥 ERRORE:", err.message);

    return {
      statusCode: 200,
      body: JSON.stringify([
        {
          title: "⚠ News non disponibili",
          text: "Sleeper API momentaneamente bloccata",
          updated: Math.floor(Date.now() / 1000)
        }
      ])
    };

  }

};
