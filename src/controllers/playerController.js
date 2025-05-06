const Player = require('../models/Player');
const walletService = require('../services/walletService');

/**
 * Create a new player
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createPlayer = async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    // Check if player already exists
    const existingPlayer = await Player.findOne({ username });
    
    if (existingPlayer) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    
    // Create new player
    const player = new Player({
      username,
      // Start with default balances
      wallets: {
        bitcoin: { balance: 0 },
        ethereum: { balance: 0 },
        usd: { balance: 1000 } // Start with $1000 for testing
      }
    });
    
    await player.save();
    
    res.status(201).json({
      message: 'Player created successfully',
      player: {
        id: player._id,
        username: player.username,
        wallets: player.wallets
      }
    });
  } catch (error) {
    console.error('Error creating player:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get player by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPlayer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const player = await Player.findById(id);
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    res.status(200).json({
      player: {
        id: player._id,
        username: player.username,
        wallets: player.wallets
      }
    });
  } catch (error) {
    console.error('Error getting player:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get player wallet balance with USD equivalents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getWalletBalance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const balance = await walletService.getWalletBalance(id);
    
    res.status(200).json(balance);
  } catch (error) {
    console.error('Error getting wallet balance:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all players
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllPlayers = async (req, res) => {
  try {
    const players = await Player.find();
    
    res.status(200).json({
      count: players.length,
      players: players.map(player => ({
        id: player._id,
        username: player.username,
        wallets: player.wallets
      }))
    });
  } catch (error) {
    console.error('Error getting all players:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createPlayer,
  getPlayer,
  getWalletBalance,
  getAllPlayers
};
