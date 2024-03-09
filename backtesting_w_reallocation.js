/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
const axios = require('axios');
const moment = require('moment');

const API_KEY = 'bd861864-d25a-40cf-8545-6d8f70353b68';
const HISTORICAL_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/historical';
const LATEST_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest';
const HISTORICAL_QUOTES_URL = 'https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/historical';

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

    return marketCap < 1e9 && volumeMarketCapRatio > 10;
  });

  // Extract IDs and historical prices of the filtered tokens
  const tokenData = filteredTokens.map((token) => ({
    id: token.id,
    historicalPrice: token.quote.USD.price,
    percent_change_24h: token.quote.USD.percent_change_24h,
  }));

  return tokenData;
}

async function findBestPerformingTokenAtTimestamp(exitTimestamp) {
  // Convert exitTimestamp to a format suitable for fetchHistoricalData
  const exitDate = moment(exitTimestamp).format('YYYY-MM-DD');

  // Fetch historical data for all tokens up to the exit date
  const historicalData = await fetchHistoricalData(exitDate);

  // Filter tokens based on your initial criteria
  const filteredTokens = filterTokens(historicalData);

  // Calculate performance of each token
  let bestToken = null;
  let bestPerformance = -Infinity;

  for (const token of filteredTokens) {
    if (token.percent_change_24h > bestPerformance) {
      bestPerformance = performance;
      bestToken = token;
    }
  }

  return bestToken;
}

async function simulateInvestmentWithReinvestment(tokenData, stopLoss = -0.10, takeProfit = 0.70) {
  // Fetch historical quotes for the simulation period
  const sevenDaysAgo = moment().subtract(7, 'days').toISOString();
  const now = moment().toISOString();
  const historicalQuotes = await fetchHistoricalQuotes(tokenData.map((token) => token.id), sevenDaysAgo, now);

  const simulationResults = [];
  const reinvestmentOpportunities = [];

  // Initial simulation to determine performance and stop-loss exits
  for (const token of tokenData) {
    const quotes = historicalQuotes[token.id].quotes;
    let investmentValue = 100; // Initial investment
    let exitTriggered = false;
    let exitTimestamp = null;

    for (let i = 1; i < quotes.length; i++) {
      const previousPrice = quotes[i - 1].quote.USD.price;
      const currentPrice = quotes[i].quote.USD.price;
      const priceChange = (currentPrice - previousPrice) / previousPrice;

      if (priceChange <= stopLoss || priceChange >= takeProfit) {
        exitTriggered = true;
        exitTimestamp = quotes[i].timestamp;
        const unitsBought = 100 / quotes[0].quote.USD.price;
        investmentValue = unitsBought * currentPrice;
        reinvestmentOpportunities.push({exitTimestamp: exitTimestamp, value: investmentValue});
        console.log(`Exited at timestamp: ${exitTimestamp}`); // Log the exit timestamp
        break;
      }
    }

    simulationResults.push({id: token.id, finalValue: investmentValue, exitTriggered, exitTimestamp: exitTimestamp});
  }

  // Identify the best-performing token at each exit point and simulate reinvestment
  for (const opportunity of reinvestmentOpportunities) {
    const bestPerformingToken = await findBestPerformingTokenAtTimestamp(opportunity.exitTimestamp);
    console.log('Best performing token is: ', bestPerformingToken);
    // Simulate reinvestment into the best-performing token
    // This requires adjusting the finalValue of the bestPerformingToken based on the reinvestment
  }

  // Final calculation of the portfolio value
  //   const totalPortfolioValue = simulationResults.reduce((acc, curr) => acc + curr.finalValue, 0);

  //   return totalPortfolioValue;
  return simulationResults;
}

// Main function to backtest the strategy
async function backtestStrategy() {
  const sevenDaysAgo = moment().subtract(7, 'days').format('YYYY-MM-DD');
  const historicalData = await fetchHistoricalData(sevenDaysAgo);
  const tokenData = filterTokens(historicalData);
  const tokenCount = tokenData.length;

  const ids = tokenData.map((token) => token.id);
  const currentData = await fetchCurrentDataByIds(ids);
  const simulationResults = await simulateInvestmentWithReinvestment(tokenData);

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
      totalPortfolioValue += valueNow;
    }
  }

  console.log(`Total portfolio value: $${totalPortfolioValue.toFixed(2)}`);
  const initialValue = tokenCount*100;
  console.log(`Initial portfolio value:  $${initialValue.toFixed(2)}`);
  const percentageGainOrLoss = (totalPortfolioValue - initialValue) / initialValue;
  console.log('Percentage gain or loss: ', percentageGainOrLoss);
}

backtestStrategy();
