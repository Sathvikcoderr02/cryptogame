const express = require('express');
const gameController = require('../controllers/gameController');

const router = express.Router();

// Get current game state
router.get('/state', gameController.getGameState);

// Get game history
router.get('/history', gameController.getGameHistory);

// Get game by ID
router.get('/:id', gameController.getGameById);

// Place a bet
router.post('/bet', gameController.placeBet);

// Cash out
router.post('/cashout', gameController.cashout);

// Verify game fairness
router.get('/:id/verify', gameController.verifyGameFairness);

module.exports = router;
