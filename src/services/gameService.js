const crypto = require('crypto');
const config = require('../config/config');
const Game = require('../models/Game');
const Bet = require('../models/Bet');
const cryptoApi = require('./cryptoApi');

// Game state
let currentGame = null;
let gameInterval = null;
let multiplier = 1;
let isGameRunning = false;
let gameStartTime = null;

/**
 * Generate a provably fair crash point
 * @param {string} seed - Random seed for this round
 * @param {string} roundId - Unique round identifier
 * @returns {Object} Crash point and hash details
 */
const generateCrashPoint = (seed, roundId) => {
  // Combine seed and round ID to create a unique hash
  const combinedString = `${seed}-${roundId}`;
  const hash = crypto.createHash('sha256').update(combinedString).digest('hex');
  
  // Use the first 8 characters of the hash as a hex number
  const hexValue = hash.substring(0, 8);
  // Convert hex to decimal and scale to get crash point
  const decimalValue = parseInt(hexValue, 16);
  
  // Generate a crash point between 1 and 100 (can be adjusted)
  // Formula: 1 + (decimal / max_decimal) * 99
  // This gives a range from 1.00x to 100.00x
  const maxDecimal = parseInt('ffffffff', 16);
  const crashPoint = 1 + (decimalValue / maxDecimal) * 99;
  
  return {
    crashPoint: parseFloat(crashPoint.toFixed(2)),
    seed,
    hash
  };
};

/**
 * Calculate current multiplier based on elapsed time
 * @param {number} elapsedMs - Elapsed time in milliseconds
 * @returns {number} Current multiplier
 */
const calculateMultiplier = (elapsedMs) => {
  // Formula: multiplier = 1 + (time_elapsed * growth_factor)
  // Adjust growth factor to control game speed
  const growthFactor = 0.05; // Adjust this value to make the game faster or slower
  const elapsedSeconds = elapsedMs / 1000;
  const multiplier = 1 + (elapsedSeconds * growthFactor);
  
  return parseFloat(multiplier.toFixed(2));
};

/**
 * Start a new game round
 * @returns {Object} New game details
 */
const startNewGame = async () => {
  try {
    // Generate a unique round ID
    const roundId = `round-${Date.now()}`;
    
    // Generate a random seed for this round
    const seed = crypto.randomBytes(16).toString('hex');
    
    // Generate crash point
    const { crashPoint, hash } = generateCrashPoint(seed, roundId);
    
    // Get current crypto prices
    const cryptoPrices = await cryptoApi.getCryptoPrices();
    
    // Create a new game in the database
    const newGame = new Game({
      roundId,
      startTime: new Date(),
      crashPoint,
      seed,
      hash,
      status: 'active',
      cryptoPrices
    });
    
    await newGame.save();
    
    // Update current game state
    currentGame = newGame;
    multiplier = 1;
    isGameRunning = true;
    gameStartTime = Date.now();
    
    console.log(`New game started: Round ${roundId}, Crash point: ${crashPoint}x`);
    
    return newGame;
  } catch (error) {
    console.error('Error starting new game:', error.message);
    throw error;
  }
};

/**
 * End the current game round
 * @returns {Object} Completed game details
 */
const endGame = async () => {
  try {
    if (!currentGame) {
      throw new Error('No active game to end');
    }
    
    // Update game in database
    const updatedGame = await Game.findByIdAndUpdate(
      currentGame._id,
      {
        endTime: new Date(),
        status: 'completed'
      },
      { new: true }
    );
    
    // Update all active bets to 'lost'
    await Bet.updateMany(
      { gameId: currentGame._id, status: 'active' },
      { status: 'lost' }
    );
    
    // Reset game state
    isGameRunning = false;
    
    console.log(`Game ended: Round ${currentGame.roundId}, Crash point: ${currentGame.crashPoint}x`);
    
    return updatedGame;
  } catch (error) {
    console.error('Error ending game:', error.message);
    throw error;
  }
};

/**
 * Get current game state
 * @returns {Object} Current game state
 */
const getGameState = () => {
  if (!currentGame || !isGameRunning) {
    return {
      isActive: false,
      nextGameIn: gameInterval ? Math.max(0, config.gameInterval - (Date.now() - (gameStartTime || Date.now()))) : 0
    };
  }
  
  const elapsedMs = Date.now() - gameStartTime;
  const currentMultiplier = calculateMultiplier(elapsedMs);
  
  return {
    isActive: isGameRunning,
    gameId: currentGame._id,
    roundId: currentGame.roundId,
    multiplier: currentMultiplier,
    elapsedMs,
    startTime: gameStartTime
  };
};

/**
 * Check if the game has crashed based on current multiplier
 * @returns {boolean} True if game has crashed
 */
const hasGameCrashed = () => {
  if (!currentGame || !isGameRunning) {
    return false;
  }
  
  const elapsedMs = Date.now() - gameStartTime;
  const currentMultiplier = calculateMultiplier(elapsedMs);
  
  return currentMultiplier >= currentGame.crashPoint;
};

module.exports = {
  startNewGame,
  endGame,
  getGameState,
  hasGameCrashed,
  generateCrashPoint,
  calculateMultiplier
};
