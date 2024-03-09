/* eslint-disable max-len */
/* eslint-disable camelcase */
/* eslint-disable require-jsdoc */
const WebSocket = require('ws');

// Replace 'bnbbtc@kline_6h' with your desired stream
const binanceWsUrl_4hr = 'wss://stream.binance.com:9443/ws/!ticker_4h@arr';
const binanceWsUrl_24hr = 'wss://stream.binance.com:9443/ws/!ticker_1d@arr';

const ws_4hr = new WebSocket(binanceWsUrl_4hr);
const ws_24hr = new WebSocket(binanceWsUrl_24hr);

ws_4hr.on('open', function open() {
  console.log('Connected to the Binance stream for 4 hr updates!');
});

ws_24hr.on('open', function open() {
  console.log('Connected to the Binance stream for 24 hr updates!');
});

function sort_message(short_array, long_array) {
  // Create a set of 's' values from the long_array for quick lookup.
  const longSet = new Set(long_array.map((item) => item.s));

  // Filter out the elements in short_array that are also in long_array.
  const filtered_short_array = short_array.filter((item) => !longSet.has(item.s));

  // Sort the filtered array by 'P' field in descending order.
  const sorted_short_array = filtered_short_array.sort((a, b) => b.P - a.P);

  // Get the top 5 elements.
  const top5_short_array = sorted_short_array.slice(0, 5);

  return top5_short_array;
}

let short_array = [];
let long_array = [];
let changed_short_array = false;
let changed_long_array = false;

// Define your function
function checkVariables() {
  if (changed_short_array === true && changed_long_array === true) {
    // Both variables are true, so execute your code here.
    console.log('Both variables are true!');
    changed_short_array = false;
    changed_long_array = false;
    const top5 = sort_message(short_array, long_array);
    console.log('Top 5: ', top5 );
  }
}

// Set an interval to check the variables every second (1000 milliseconds).
// You can adjust the interval as needed.
setInterval(checkVariables, 500);

ws_4hr.on('message', function incoming(data) {
  // Parse the stringified message.
  const message = JSON.parse(data);
  short_array = message;
  changed_short_array = true;

  // Here you handle the incoming message.
  //   console.log('Received message:', message);
  //   const top5 = sort_message(message);
  //   console.log('Top 5: ', top5 );

  // Your logic to detect the price change would be here.
});

ws_24hr.on('message', function incoming(data) {
  // Parse the stringified message.
  const message = JSON.parse(data);
  long_array = message;
  changed_long_array = true;

  // Here you handle the incoming message.
  //   const top5 = sort_message(message);
  //   console.log('Top 5: ', top5 );

  // Your logic to detect the price change would be here.
});

// ws.on('close', function close() {
//   console.log('Disconnected from the Binance stream');
//   // Here you might want to implement reconnection logic.
// });

// ws.on('error', function error(error) {
//   console.log('WebSocket error:', error);
//   // Here you might want to log errors or implement reconnection logic.
// });

ws_4hr.on('ping', function incoming(data) {
  // Respond with a pong frame with the same payload as the ping frame.
  ws.pong(data);
  console.log('Received ping and sent pong with payload:', data.toString());
});

ws_24hr.on('ping', function incoming(data) {
  // Respond with a pong frame with the same payload as the ping frame.
  ws.pong(data);
  console.log('Received ping and sent pong with payload:', data.toString());
});
