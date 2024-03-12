/* eslint-disable camelcase */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");

const API_KEY = "bd861864-d25a-40cf-8545-6d8f70353b68";
const latest_listings = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest";
// const LATEST_URL = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest";
// const HISTORICAL_QUOTES_URL = "https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/historical";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// const db = admin.firestore();

const corsOptions = {
  origin: true,
};

/**
 * Find the listings from CMC and return the latest listings.
 * @return {Object[]} An array of objects, each representing a latest listing.
 */
async function find_latest_listings() {
  try {
    const response = await axios.get(latest_listings, {
      headers: {
        "X-CMC_PRO_API_KEY": API_KEY,
      },
      params: {
        limit: 200,
        convert: "USD",
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching latest listings:", error);
    return [];
  }
}

/**
 *
 * @param {Object[]} latest_listings An array of objects, each representing a latest listing.
 * @return {Object[]} An array of objects, each representing a investable token.
 */
function find_investable_tokens(latest_listings) {
  const filtered_tokens = latest_listings.filter((token) => {
    const marketCap = token.quote.USD.market_cap;
    const volume24h = token.quote.USD.volume_24h;
    const volumeMarketCapRatio = (volume24h / marketCap) * 100;
    const priceChange24h = token.quote.USD.percent_change_24h * 100;
    // const priceChange7d = token.quote.USD.percent_change_7d * 100;

    return marketCap < 1e9 && volumeMarketCapRatio > 15 && priceChange24h < 15;
  });

  const investable_tokens = filtered_tokens.map((token) => ({
    symbol: token.symbol,
    name: token.name,
    id: token.id,
    price: token.quote.USD.price,
  }));

  return investable_tokens;
}


const StrategyDeployed = functions.region("asia-east2").https.onRequest(async (req, res) => {
  cors(corsOptions)(req, res, async () => {
    const latest_listings = await find_latest_listings();

    const investable_tokens = find_investable_tokens(latest_listings);


    res.status(200).send(investable_tokens);
    // res.status(200).send("Strategy deployed successfully");
  });
});

module.exports = StrategyDeployed;
