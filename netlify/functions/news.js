const fetch = require("node-fetch");

exports.handler = async function () {

  try {

    const res = await fetch("https://www.nfl.com/rss/rsslanding?searchString=home");

    const text = await res.text();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify([
        {
          title: "📰 NFL News Live",
          text: "Feed attivo correttamente (RSS collegato)",
          updated: Math.floor(Date.now() / 1000)
        }
      ])
    };

  } catch (err) {

    return {
      statusCode: 500,
      body: JSON.stringify([{ title: "Errore news", text: "RSS fallito" }])
    };

  }

};
