const express = require('express');
const playerController = require('../controllers/playerController');

const router = express.Router();

// Create a new player
router.post('/', playerController.createPlayer);

// Get all players
router.get('/', playerController.getAllPlayers);

// Get player by ID
router.get('/:id', playerController.getPlayer);

// Get player wallet balance
router.get('/:id/wallet', playerController.getWalletBalance);

module.exports = router;
