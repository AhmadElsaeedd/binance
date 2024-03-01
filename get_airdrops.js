const axios = require('axios');

// eslint-disable-next-line require-jsdoc, camelcase
async function get_airdrops() {
  let response = null;
  new Promise(async (resolve, reject) => {
    try {
      response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/airdrops?status=UPCOMING', {
        headers: {
          'X-CMC_PRO_API_KEY': 'bd861864-d25a-40cf-8545-6d8f70353b68',
        },
      });
    } catch (ex) {
      response = null;
      // error
      console.log(ex);
      reject(ex);
    }
    if (response) {
      // success
      const json = response.data;
      console.log(json);
      resolve(json);
    }
  });
}

get_airdrops();
