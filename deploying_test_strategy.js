/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
const axios = require('axios');
const moment = require('moment');

const API_KEY = 'bd861864-d25a-40cf-8545-6d8f70353b68';
const LATEST_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/listings/latest';
const HISTORICAL_QUOTES_URL = 'https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/historical';

// Function to fetch current data for a list of IDs using the Quotes Latest v2 endpoint
async function fetchCurrentData() {
  try {
    const response = await axios.get(LATEST_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY,
      },
      params: {
        convert: 'USD',
        limit: 500,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('Error fetching current data by IDs:', error);
    return [];
  }
}


// Function to fetch historical quotes for a list of IDs
async function fetchHistoricalQuotes(ids, timeStart, timeEnd, interval = '24h') {
  try {
    const response = await axios.get(HISTORICAL_QUOTES_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY,
      },
      params: {
        id: ids.join(','),
        time_start: timeStart,
        time_end: timeEnd,
        interval: interval,
        convert: 'USD',
      },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching historical quotes:', error);
    return {};
  }
}

// Function to filter tokens based on your criteria and extract their IDs along with historical prices
function filterTokens(tokens) {
  const filteredTokens = tokens.filter((token) => {
    const marketCap = token.quote.USD.market_cap;
    const volume24h = token.quote.USD.volume_24h;
    const volumeMarketCapRatio = (volume24h / marketCap) * 100;

    return marketCap < 1e9 && volumeMarketCapRatio > 15;
  });

  // Extract IDs and historical prices of the filtered tokens
  const tokenData = filteredTokens.map((token) => ({
    symbol: token.symbol,
    name: token.name,
    id: token.id,
    price: token.quote.USD.price,
  }));

  return tokenData;
}

// Function to simulate investment with stop-loss and take-profit
async function simulateInvestmentWithStopLossAndTakeProfit(tokenData, stopLoss = -0.10, takeProfit = 0.70) {
  const thirtyDaysAgo = moment().subtract(20, 'days').toISOString(); // Adjusted from 7 to 30 days
  const now = moment().toISOString();
  const historicalQuotes = await fetchHistoricalQuotes(tokenData.map((token) => token.id), thirtyDaysAgo, now);
  const simulationResults = [];

  for (const token of tokenData) {
    const quotes = historicalQuotes[token.id].quotes;
    let investmentValue = 100; // Initial investment
    let exitTriggered = false;
    let exitTimestamp = null; // Variable to store the exit timestamp
    console.log(`Invested in ${token.symbol} (${token.name}) at ${quotes[0].timestamp} with initial value: $100`);

    for (let i = 1; i < quotes.length; i++) {
      const previousPrice = quotes[i - 1].quote.USD.price;
      const currentPrice = quotes[i].quote.USD.price;
      const priceChange = (currentPrice - previousPrice) / previousPrice;

      if (priceChange >= takeProfit) {
        exitTriggered = true;
        exitTimestamp = quotes[i].timestamp; // Store the exit timestamp
        const unitsBought = 100 / quotes[0].quote.USD.price;
        investmentValue = unitsBought * currentPrice;
        console.log(`Exited ${token.symbol} (${token.name}) at ${exitTimestamp} with final value: $${investmentValue.toFixed(2)} due to ${priceChange >= takeProfit ? 'take-profit' : 'stop-loss'}`);
        break; // Exit the investment
      }
    }

    simulationResults.push({id: token.id, exitTriggered, finalValue: investmentValue});
  }

  return simulationResults;
}

async function buyTokens(tokenData) {
  for (const token of tokenData) {
    console.log('Buying token: ', token);
    await csvWriter.writeRecords([{
      timestamp: new Date().toISOString(),
      action: 'BUY',
      symbol: token.symbol,
      price: token.price,
      amount: 100 / token.price,
    }]);
    console.log(`Logged BUY for ${token.symbol}`);
  }
}


// Main function to backtest the strategy
async function strategy() {
  const currentData = await fetchCurrentData();
  const tokenData = filterTokens(currentData);
  const tokenCount = tokenData.length;

  // ToDo: write a function that "buys" the tokens that are in tokenData
  await buyTokens(tokenData);

  //   const simulationResults = await simulateInvestmentWithStopLossAndTakeProfit(tokenData);

  let totalPortfolioValue = 0;

  for (const result of simulationResults) {
    if (result.exitTriggered) {
      totalPortfolioValue += result.finalValue;
    } else {
      const token = tokenData.find((t) => t.id === result.id);
      const currentTokenData = currentData.find((t) => t.id === result.id);
      const currentPrice = currentTokenData ? currentTokenData.quote : 0;
      const unitsBought = 100 / token.historicalPrice;
      const valueNow = unitsBought * currentPrice;
      console.log(`Active investment in ${token.symbol} (${token.name}) with final value: $${valueNow}`);
      totalPortfolioValue += valueNow;
    }
  }

  console.log(`Total portfolio value: $${totalPortfolioValue.toFixed(2)}`);
  const initialValue = tokenCount*100;
  console.log(`Initial portfolio value:  $${initialValue.toFixed(2)}`);
  const percentageGainOrLoss = (totalPortfolioValue - initialValue) / initialValue;
  console.log('Percentage gain or loss: ', percentageGainOrLoss);
}

const csvWriter = createCsvWriter({
  path: 'trade_log.csv',
  header: [
    {id: 'timestamp', title: 'TIMESTAMP'},
    {id: 'action', title: 'ACTION'},
    {id: 'symbol', title: 'SYMBOL'},
    {id: 'price', title: 'PRICE'},
    {id: 'amount', title: 'AMOUNT'},
    // Add more fields as necessary
  ],
});

strategy();
