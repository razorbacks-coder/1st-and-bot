exports.handler = async function () {

  try {

    const LEAGUE_ID = "10241";

    // roster
    const rosterRes = await fetch(`https://api.myfantasyleague.com/2026/export?TYPE=rosters&L=${LEAGUE_ID}`);
    const rosterText = await rosterRes.text();

    // players
    const playersRes = await fetch(`https://api.myfantasyleague.com/2026/export?TYPE=players`);
    const playersText = await playersRes.text();

    // parse semplice
    const rosterIds = [...rosterText.matchAll(/id="(\d+)"/g)].map(m => m[1]);

    const allPlayers = [...playersText.matchAll(/id="(\d+)" name="([^"]+)" position="([^"]+)"/g)]
      .map(m => ({
        id: m[1],
        name: m[2],
        pos: m[3]
      }));

    // free agents
    const freeAgents = allPlayers.filter(p => !rosterIds.includes(p.id));

    // ranking
    function getValue(pos) {
      if (pos === "RB") return 5;
      if (pos === "WR") return 4;
      if (pos === "QB") return 3;
      if (pos === "TE") return 2;
      return 1;
    }

    freeAgents.sort((a,b) => getValue(b.pos) - getValue(a.pos));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(freeAgents.slice(0, 10))
    };

  } catch (err) {

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "FA error" })
    };

  }

};
