const crypto = require('crypto');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const cryptoApi = require('./cryptoApi');

/**
 * Generate a mock transaction hash
 * @returns {string} Mock transaction hash
 */
const generateTransactionHash = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get player wallet balance
 * @param {string} playerId - Player ID
 * @returns {Object} Wallet balances with USD equivalents
 */
const getWalletBalance = async (playerId) => {
  try {
    const player = await Player.findById(playerId);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Get current crypto prices
    const prices = await cryptoApi.getCryptoPrices();
    
    // Calculate USD equivalents
    const bitcoinUsdValue = player.wallets.bitcoin.balance * prices.bitcoin;
    const ethereumUsdValue = player.wallets.ethereum.balance * prices.ethereum;
    
    return {
      wallets: {
        bitcoin: {
          balance: player.wallets.bitcoin.balance,
          usdEquivalent: bitcoinUsdValue
        },
        ethereum: {
          balance: player.wallets.ethereum.balance,
          usdEquivalent: ethereumUsdValue
        },
        usd: {
          balance: player.wallets.usd.balance
        }
      },
      totalUsdValue: player.wallets.usd.balance + bitcoinUsdValue + ethereumUsdValue
    };
  } catch (error) {
    console.error('Error getting wallet balance:', error.message);
    throw error;
  }
};

/**
 * Process a bet by deducting USD and converting to crypto
 * @param {string} playerId - Player ID
 * @param {number} usdAmount - Bet amount in USD
 * @param {string} cryptocurrency - Cryptocurrency to bet with
 * @returns {Object} Bet details
 */
const processBet = async (playerId, usdAmount, cryptocurrency) => {
  try {
    // Validate inputs
    if (usdAmount <= 0) {
      throw new Error('Bet amount must be greater than zero');
    }
    
    if (!['bitcoin', 'ethereum'].includes(cryptocurrency)) {
      throw new Error('Invalid cryptocurrency');
    }
    
    // Find player
    const player = await Player.findById(playerId);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    console.log(`Processing bet for player ${playerId}:`, {
      currentUsdBalance: player.wallets.usd.balance,
      betAmount: usdAmount,
      cryptocurrency
    });
    
    // Check if player has enough USD
    if (player.wallets.usd.balance < usdAmount) {
      throw new Error('Insufficient USD balance');
    }
    
    // Convert USD to crypto
    const conversion = await cryptoApi.convertUsdToCrypto(usdAmount, cryptocurrency);
    
    // Generate transaction hash
    const transactionHash = generateTransactionHash();
    
    // Update player's USD balance
    player.wallets.usd.balance -= usdAmount;
    
    console.log(`Updated player USD balance:`, {
      newUsdBalance: player.wallets.usd.balance,
      deducted: usdAmount
    });
    
    // Save the updated player document
    await player.save();
    
    // Create transaction record
    const transaction = new Transaction({
      playerId,
      usdAmount,
      cryptoAmount: conversion.cryptoAmount,
      cryptocurrency,
      transactionType: 'bet',
      transactionHash,
      priceAtTime: conversion.cryptoPrice
    });
    
    await transaction.save();
    
    return {
      playerId,
      usdAmount,
      cryptoAmount: conversion.cryptoAmount,
      cryptocurrency,
      cryptoPrice: conversion.cryptoPrice,
      transactionHash,
      newUsdBalance: player.wallets.usd.balance
    };
  } catch (error) {
    console.error('Error processing bet:', error.message);
    throw error;
  }
};

/**
 * Process a cashout by adding crypto winnings to player's wallet
 * @param {string} playerId - Player ID
 * @param {string} betId - Bet ID
 * @param {number} cryptoAmount - Crypto amount won
 * @param {string} cryptocurrency - Cryptocurrency type
 * @param {number} multiplier - Cashout multiplier
 * @returns {Object} Cashout details
 */
const processCashout = async (playerId, betId, cryptoAmount, cryptocurrency, multiplier) => {
  try {
    // Find player
    const player = await Player.findById(playerId);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    console.log(`Processing cashout for player ${playerId}:`, {
      currentCryptoBalance: player.wallets[cryptocurrency].balance,
      currentUsdBalance: player.wallets.usd.balance,
      winnings: cryptoAmount,
      cryptocurrency
    });
    
    // Convert crypto to USD for display
    const conversion = await cryptoApi.convertCryptoToUsd(cryptoAmount, cryptocurrency);
    
    // Generate transaction hash
    const transactionHash = generateTransactionHash();
    
    // Update player's crypto balance
    player.wallets[cryptocurrency].balance += cryptoAmount;
    
    console.log(`Updated player wallet:`, {
      newCryptoBalance: player.wallets[cryptocurrency].balance,
      cryptocurrency,
      usdEquivalent: conversion.usdAmount
    });
    
    // Save the updated player document
    await player.save();
    
    // Create transaction record
    const transaction = new Transaction({
      playerId,
      betId,
      usdAmount: conversion.usdAmount,
      cryptoAmount,
      cryptocurrency,
      transactionType: 'cashout',
      transactionHash,
      priceAtTime: conversion.cryptoPrice
    });
    
    await transaction.save();
    
    return {
      playerId,
      betId,
      cryptoAmount,
      usdEquivalent: conversion.usdAmount,
      cryptocurrency,
      multiplier,
      transactionHash,
      newCryptoBalance: player.wallets[cryptocurrency].balance
    };
  } catch (error) {
    console.error('Error processing cashout:', error.message);
    throw error;
  }
};

module.exports = {
  getWalletBalance,
  processBet,
  processCashout,
  generateTransactionHash
};
