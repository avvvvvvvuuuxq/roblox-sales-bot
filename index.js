require('dotenv').config();
const noblox = require('noblox.js');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const GROUP_ID = 35369412; // Change this to your group ID

let lastCheck = Date.now();

async function sendDiscordSaleEmbed(sale) {
  const username = `@${sale.agent.name}`;
  const itemName = sale.details.name;

  let robuxSpent;
  if (typeof sale.robux === 'number' && sale.robux > 0) {
    robuxSpent = sale.robux;
  } else if (sale.details && typeof sale.details.price === 'number' && sale.details.price > 0) {
    robuxSpent = sale.details.price;
  } else {
    robuxSpent = "Unknown";
  }

  const saleEmbed = {
    title: "🛒 New Purchase",
    color: 0x131416,
    description:
      `<:ArrowRight:1328822678781563044> Interested in the same item shown above? Grab it in <#1387913874656985272>\n` +
      `<:ArrowRight:1328822678781563044> Bought an item? Open up an assistance ticket inside of <#1148431105440104448>`,
    fields: [
      { name: "👤 Buyer", value: username, inline: true },
      { name: "💰 Robux Spent", value: robuxSpent === "Unknown" ? robuxSpent : `R$${robuxSpent}`, inline: true },
      { name: "📦 Item", value: itemName, inline: true },
    ],
    footer: {
      text: `OVRP Store Sales | ${new Date().toLocaleString()}`
    }
  };

  try {
    console.log(`Sending sale: ${username} bought "${itemName}" for ${robuxSpent}`);
    await axios.post(DISCORD_WEBHOOK, { embeds: [saleEmbed] });
    console.log(`✅ Sent sale embed for ${username}`);
  } catch (err) {
    console.error("❌ Failed to send sale to Discord:", err.message);
    if (err.response) {
      console.error("Discord API Response:", err.response.status, err.response.data);
    }
  }
}

async function startBot() {
  try {
    await noblox.setCookie(ROBLOX_COOKIE);
    const me = await noblox.getAuthenticatedUser();
    console.log(`✅ Logged in as ${me.UserName}`);

    await axios.post(DISCORD_WEBHOOK, {
      embeds: [{
        color: 0x2ecc71,
        description: "<:Online:1213640815448956958> OVRP | New Sale now starting."
      }]
    });
  } catch (err) {
    console.error("❌ Login failed:", err.message);
    await axios.post(DISCORD_WEBHOOK, {
      content: `❌ **Sales Bot failed to start:** \`\`\`${err.message}\`\`\``
    });
    return;
  }

  setInterval(async () => {
    try {
      const transactions = await noblox.getGroupTransactions(GROUP_ID, "Sale", "Asc");
      const newSales = transactions.filter(tx => new Date(tx.created).getTime() > lastCheck);
      if (newSales.length > 0) {
        lastCheck = Date.now();
        for (const sale of newSales) {
          await sendDiscordSaleEmbed(sale);
        }
      }
    } catch (err) {
      console.warn(⚠️ Error fetching transactions:", err.message);
    }
  }, 15000);
}

process.on("SIGINT", async () => {
  console.log("🛑 Bot shutting down.");
  await axios.post(DISCORD_WEBHOOK, {
    embeds: [{
      color: 0xe74c3c,
      description: "<:red:1388875411517210636> OVRP | New sale now stopping."
    }]
  });
  process.exit();
});

app.get("/", (req, res) => res.send("I'm alive!"));

app.listen(PORT, () => {
  console.log(`🌐 Webserver running on port ${PORT}`);
  startBot();
});
