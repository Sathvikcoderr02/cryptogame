require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptogame',
  cryptoApiKey: process.env.CRYPTO_API_KEY,
  cryptoApiUrl: process.env.CRYPTO_API_URL || 'https://api.coingecko.com/api/v3',
  gameInterval: parseInt(process.env.GAME_INTERVAL) || 10000, // 10 seconds in milliseconds
  supportedCryptocurrencies: ['bitcoin', 'ethereum'],
  cryptoSymbols: {
    bitcoin: 'BTC',
    ethereum: 'ETH'
  }
};
