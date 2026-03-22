const Parser = require("rss-parser");
const parser = new Parser();

exports.handler = async function () {

  try {

    const feed = await parser.parseURL("https://www.nfl.com/rss/rsslanding?searchString=home");

    const news = feed.items.slice(0, 6).map(item => ({
      title: item.title,
      text: item.contentSnippet || item.content || "",
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

    console.error("RSS ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify([
        {
          title: "Errore news",
          text: "RSS parsing fallito",
          updated: Math.floor(Date.now() / 1000)
        }
      ])
    };

  }

};
