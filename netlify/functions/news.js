const fetch = require("node-fetch");

exports.handler = async function () {

  try {

    const res = await fetch("https://api.sleeper.app/v1/news/nfl", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const text = await res.text();

    if (text.startsWith("<")) {
      throw new Error("Sleeper blocked request");
    }

    const data = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "news error" })
    };
  }

};
