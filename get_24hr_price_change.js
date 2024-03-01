/* eslint-disable require-jsdoc */
/* eslint-disable camelcase */
const axios = require('axios');

function filter_price_change(items) {
  return items.filter((item) => item.priceChangePercent > 10);
}

// eslint-disable-next-line require-jsdoc, camelcase
async function get_price_change() {
  try {
    const response = await axios.get('https://data-api.binance.vision/api/v3/ticker/24hr');
    const filtered_objects = filter_price_change(response.data);
    // success
    console.log(filtered_objects);
    console.log('I found this many objects: ', filtered_objects.length);
    return response.data; // Return the data for further processing
  } catch (ex) {
    // error
    console.error(ex);
    throw ex; // Rethrow the error to be handled by the caller
  }
}

(async () => {
//   const price_change = await get_price_change();
  await get_price_change();
//   console.log(price_change);
})();
