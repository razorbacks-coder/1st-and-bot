const fetch = require("node-fetch");
const Parser = require("rss-parser");

const parser = new Parser();

exports.handler = async function () {

  try {

    const res = await fetch("https://www.nfl.com/rss/rsslanding?searchString=home", {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const xml = await res.text();

    const feed = await parser.parseString(xml);

    const news = feed.items.slice(0, 6).map(item => ({
      title: item.title,
      text: item.contentSnippet || "",
      updated: Math.floor(new Date(item.pubDate).getTime() / 1000)
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(news)
    };

  } catch (err) {

    console.error("🔥 RSS ERROR:", err);

    return {
      statusCode: 200,
      body: JSON.stringify([
        {
          title: "⚠ News temporaneamente non disponibili",
          text: "Problema nel feed NFL",
          updated: Math.floor(Date.now() / 1000)
        }
      ])
    };

  }

};
