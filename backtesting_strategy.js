/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
const axios = require('axios');
const moment = require('moment');

const API_KEY = 'bd861864-d25a-40cf-8545-6d8f70353b68';
const HISTORICAL_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/historical';
const LATEST_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest';

// Function to fetch historical data
async function fetchHistoricalData(date) {
  try {
    const response = await axios.get(HISTORICAL_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY,
      },
      params: {
        date: date,
        limit: 500,
        convert: 'USD',
      },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

// Function to fetch current data for a list of IDs using the Quotes Latest v2 endpoint
async function fetchCurrentDataByIds(ids) {
  try {
    const response = await axios.get(LATEST_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY,
      },
      params: {
        id: ids.join(','), // Pass IDs as a comma-separated string
        convert: 'USD',
      },
    });

    // Process and return the data as needed
    const currentData = Object.values(response.data.data).map((token) => {
      if (token.quote && token.quote.USD.price) {
        return {
          id: token.id,
          symbol: token.symbol,
          quote: token.quote.USD.price,
        };
      }
      return null;
    });

    return currentData;
  } catch (error) {
    console.error('Error fetching current data by IDs:', error);
    return [];
  }
}

// Function to filter tokens based on your criteria and extract their IDs along with historical prices
function filterTokens(tokens) {
  const filteredTokens = tokens.filter((token) => {
    const marketCap = token.quote.USD.market_cap;
    const volume24h = token.quote.USD.volume_24h;
    const volumeMarketCapRatio = (volume24h / marketCap) * 100;

    return marketCap < 1e9 && volumeMarketCapRatio > 10;
  });

  // Extract IDs and historical prices of the filtered tokens
  const tokenData = filteredTokens.map((token) => ({
    id: token.id,
    historicalPrice: token.quote.USD.price,
  }));

  return tokenData;
}

// Main function to backtest the strategy
async function backtestStrategy() {
  const sevenDaysAgo = moment().subtract(7, 'days').format('YYYY-MM-DD');
  const historicalData = await fetchHistoricalData(sevenDaysAgo);
  const tokenData = filterTokens(historicalData);

  const ids = tokenData.map((token) => token.id); // Extract just the IDs to fetch current data
  const currentData = await fetchCurrentDataByIds(ids);

  let totalValueNow = 0;
  let tokenCtr = 0;
  tokenData.forEach((token) => {
    tokenCtr++;
    const historicalPrice = token.historicalPrice;
    const currentTokenData = currentData.find((t) => t.id === token.id);
    const currentPrice = currentTokenData ? currentTokenData.quote : 0;
    const unitsBought = 100 / historicalPrice;
    const valueNow = unitsBought * currentPrice;

    console.log(`Token ID ${token.id}: $100 invested 7 days ago is now worth $${valueNow.toFixed(2)}`);
    totalValueNow += valueNow;
  });

  console.log(`Total value of investments now: $${totalValueNow.toFixed(2)}`);
  const startingAmount = tokenCtr * 100;
  console.log(`Total amount invested: $${startingAmount}`);
}

backtestStrategy();
