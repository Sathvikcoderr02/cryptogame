const axios = require('axios');
const config = require('../config/config');

// Cache for crypto prices
let priceCache = {
  bitcoin: null,
  ethereum: null,
  lastUpdated: null
};

// Cache expiration time in milliseconds (10 seconds)
const CACHE_EXPIRATION = 10000;

/**
 * Fetch real-time cryptocurrency prices
 * @returns {Object} Current prices for supported cryptocurrencies
 */
const getCryptoPrices = async () => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (
      priceCache.lastUpdated &&
      now - priceCache.lastUpdated < CACHE_EXPIRATION &&
      priceCache.bitcoin &&
      priceCache.ethereum
    ) {
      console.log('Using cached crypto prices');
      return {
        bitcoin: priceCache.bitcoin,
        ethereum: priceCache.ethereum
      };
    }

    // Fetch fresh prices from CoinGecko API
    const response = await axios.get(
      `${config.cryptoApiUrl}/simple/price?ids=bitcoin,ethereum&vs_currencies=usd`,
      {
        headers: {
          'x-cg-demo-api-key': config.cryptoApiKey || 'CG-Dkdg2euzJjwKHmHSj5qUF8p1'  // Using a demo API key as fallback
        }
      }
    );

    // Update cache
    priceCache = {
      bitcoin: response.data.bitcoin.usd,
      ethereum: response.data.ethereum.usd,
      lastUpdated: now
    };

    console.log('Fetched fresh crypto prices:', priceCache);
    return {
      bitcoin: priceCache.bitcoin,
      ethereum: priceCache.ethereum
    };
  } catch (error) {
    console.error('Error fetching crypto prices:', error.message);
    
    // If cache exists, return cached prices as fallback
    if (priceCache.bitcoin && priceCache.ethereum) {
      console.log('Using cached prices as fallback due to API error');
      return {
        bitcoin: priceCache.bitcoin,
        ethereum: priceCache.ethereum
      };
    }
    
    // If no cache, throw error
    throw new Error('Failed to fetch cryptocurrency prices');
  }
};

/**
 * Convert USD amount to cryptocurrency
 * @param {number} usdAmount - Amount in USD
 * @param {string} cryptocurrency - Cryptocurrency to convert to (bitcoin or ethereum)
 * @returns {Object} Conversion details
 */
const convertUsdToCrypto = async (usdAmount, cryptocurrency) => {
  try {
    const prices = await getCryptoPrices();
    const cryptoPrice = prices[cryptocurrency];
    
    if (!cryptoPrice) {
      throw new Error(`Price not available for ${cryptocurrency}`);
    }
    
    const cryptoAmount = usdAmount / cryptoPrice;
    
    return {
      usdAmount,
      cryptoAmount,
      cryptocurrency,
      cryptoPrice,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error converting USD to crypto:', error.message);
    throw error;
  }
};

/**
 * Convert cryptocurrency amount to USD
 * @param {number} cryptoAmount - Amount in cryptocurrency
 * @param {string} cryptocurrency - Cryptocurrency to convert from (bitcoin or ethereum)
 * @returns {Object} Conversion details
 */
const convertCryptoToUsd = async (cryptoAmount, cryptocurrency) => {
  try {
    const prices = await getCryptoPrices();
    const cryptoPrice = prices[cryptocurrency];
    
    if (!cryptoPrice) {
      throw new Error(`Price not available for ${cryptocurrency}`);
    }
    
    const usdAmount = cryptoAmount * cryptoPrice;
    
    return {
      cryptoAmount,
      usdAmount,
      cryptocurrency,
      cryptoPrice,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error converting crypto to USD:', error.message);
    throw error;
  }
};

module.exports = {
  getCryptoPrices,
  convertUsdToCrypto,
  convertCryptoToUsd
};
