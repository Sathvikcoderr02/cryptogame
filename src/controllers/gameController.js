const Game = require('../models/Game');
const Bet = require('../models/Bet');
const gameService = require('../services/gameService');
const cryptoApi = require('../services/cryptoApi');

/**
 * Get current game state
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getGameState = async (req, res) => {
  try {
    const gameState = gameService.getGameState();
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Error getting game state:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get game history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getGameHistory = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const games = await Game.find({ status: 'completed' })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Game.countDocuments({ status: 'completed' });
    
    res.status(200).json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      games: games.map(game => ({
        id: game._id,
        roundId: game.roundId,
        startTime: game.startTime,
        endTime: game.endTime,
        crashPoint: game.crashPoint,
        hash: game.hash
      }))
    });
  } catch (error) {
    console.error('Error getting game history:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get game details by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getGameById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const game = await Game.findById(id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Get bets for this game
    const bets = await Bet.find({ gameId: id }).populate('playerId', 'username');
    
    res.status(200).json({
      game: {
        id: game._id,
        roundId: game.roundId,
        startTime: game.startTime,
        endTime: game.endTime,
        crashPoint: game.crashPoint,
        status: game.status,
        hash: game.hash,
        seed: game.status === 'completed' ? game.seed : undefined, // Only show seed after game ends
        cryptoPrices: game.cryptoPrices
      },
      bets: bets.map(bet => ({
        id: bet._id,
        player: {
          id: bet.playerId._id,
          username: bet.playerId.username
        },
        usdAmount: bet.usdAmount,
        cryptoAmount: bet.cryptoAmount,
        cryptocurrency: bet.cryptocurrency,
        status: bet.status,
        cashoutMultiplier: bet.cashoutMultiplier,
        cashoutAmount: bet.cashoutAmount,
        cashoutTimestamp: bet.cashoutTimestamp
      }))
    });
  } catch (error) {
    console.error('Error getting game by ID:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Place a bet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const placeBet = async (req, res) => {
  try {
    const { playerId, usdAmount, cryptocurrency } = req.body;
    
    // Validate inputs
    if (!playerId || !usdAmount || !cryptocurrency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    if (usdAmount <= 0) {
      return res.status(400).json({ message: 'Bet amount must be greater than zero' });
    }
    
    if (!['bitcoin', 'ethereum'].includes(cryptocurrency)) {
      return res.status(400).json({ message: 'Invalid cryptocurrency' });
    }
    
    // Check if game is active
    const gameState = gameService.getGameState();
    if (gameState.isActive) {
      return res.status(400).json({ message: 'Cannot place bet while game is in progress' });
    }
    
    console.log(`Placing bet: ${usdAmount} USD in ${cryptocurrency} for player ${playerId}`);
    
    // Get current game or create a new one if none exists
    let currentGame = await Game.findOne({ status: 'pending' });
    
    if (!currentGame) {
      // Create a pending game for the next round
      const roundId = `round-${Date.now()}`;
      const seed = require('crypto').randomBytes(16).toString('hex');
      const { crashPoint, hash } = gameService.generateCrashPoint(seed, roundId);
      const cryptoPrices = await cryptoApi.getCryptoPrices();
      
      currentGame = new Game({
        roundId,
        startTime: new Date(Date.now() + 5000), // Start in 5 seconds
        crashPoint,
        seed,
        hash,
        status: 'pending',
        cryptoPrices
      });
      
      await currentGame.save();
      console.log(`Created new pending game: ${roundId} with crash point ${crashPoint}x`);
    }
    
    // Process wallet update
    const walletService = require('../services/walletService');
    const betResult = await walletService.processBet(playerId, usdAmount, cryptocurrency);
    
    console.log('Bet processed successfully:', betResult);
    
    // Convert USD to crypto
    const conversion = await cryptoApi.convertUsdToCrypto(usdAmount, cryptocurrency);
    
    // Create bet
    const bet = new Bet({
      playerId,
      gameId: currentGame._id,
      usdAmount,
      cryptoAmount: conversion.cryptoAmount,
      cryptocurrency,
      cryptoPrice: conversion.cryptoPrice,
      status: 'active'
    });
    
    await bet.save();
    
    res.status(201).json({
      message: 'Bet placed successfully',
      bet: {
        id: bet._id,
        playerId,
        gameId: currentGame._id,
        roundId: currentGame.roundId,
        usdAmount,
        cryptoAmount: conversion.cryptoAmount,
        cryptocurrency,
        cryptoPrice: conversion.cryptoPrice,
        status: 'active'
      },
      walletUpdate: {
        newUsdBalance: betResult.newUsdBalance
      }
    });
  } catch (error) {
    console.error('Error placing bet:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Cash out from an active game
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cashout = async (req, res) => {
  try {
    const { playerId, betId } = req.body;
    
    // Validate inputs
    if (!playerId || !betId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if game is active
    const gameState = gameService.getGameState();
    if (!gameState.isActive) {
      return res.status(400).json({ message: 'No active game to cash out from' });
    }
    
    // Check if game has crashed
    if (gameService.hasGameCrashed()) {
      return res.status(400).json({ message: 'Game has already crashed' });
    }
    
    // Find the bet
    const bet = await Bet.findOne({
      _id: betId,
      playerId,
      status: 'active'
    });
    
    if (!bet) {
      return res.status(404).json({ message: 'Bet not found or already cashed out' });
    }
    
    console.log(`Processing cashout for bet ${betId} by player ${playerId}`);
    
    // Calculate winnings
    const currentMultiplier = gameState.multiplier;
    const winnings = bet.cryptoAmount * currentMultiplier;
    
    console.log(`Cashout details: multiplier=${currentMultiplier}, winnings=${winnings} ${bet.cryptocurrency}`);
    
    // Update bet status
    bet.status = 'cashed_out';
    bet.cashoutMultiplier = currentMultiplier;
    bet.cashoutAmount = winnings;
    bet.cashoutTimestamp = new Date();
    await bet.save();
    
    // Process wallet update
    const walletService = require('../services/walletService');
    const cashoutResult = await walletService.processCashout(
      playerId,
      betId,
      winnings,
      bet.cryptocurrency,
      currentMultiplier
    );
    
    console.log('Cashout processed successfully:', cashoutResult);
    
    res.status(200).json({
      message: 'Cashout successful',
      cashout: {
        betId,
        playerId,
        multiplier: currentMultiplier,
        cryptoAmount: winnings,
        cryptocurrency: bet.cryptocurrency,
        timestamp: bet.cashoutTimestamp,
        walletUpdate: cashoutResult
      }
    });
  } catch (error) {
    console.error('Error cashing out:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Verify game fairness
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyGameFairness = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Only allow verification for completed games
    if (game.status !== 'completed') {
      return res.status(400).json({ message: 'Can only verify completed games' });
    }
    
    // Recalculate crash point using the seed and round ID
    const { crashPoint } = gameService.generateCrashPoint(game.seed, game.roundId);
    
    // Check if the calculated crash point matches the stored one
    const isValid = Math.abs(crashPoint - game.crashPoint) < 0.01; // Allow for small floating point differences
    
    res.status(200).json({
      gameId: game._id,
      roundId: game.roundId,
      seed: game.seed,
      hash: game.hash,
      storedCrashPoint: game.crashPoint,
      calculatedCrashPoint: crashPoint,
      isValid
    });
  } catch (error) {
    console.error('Error verifying game fairness:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getGameState,
  getGameHistory,
  getGameById,
  placeBet,
  cashout,
  verifyGameFairness
};
