const socketIo = require('socket.io');
const gameService = require('./gameService');
const Bet = require('../models/Bet');
const walletService = require('./walletService');

let io;
let multiplierInterval;
const MULTIPLIER_UPDATE_INTERVAL = 100; // Update multiplier every 100ms

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 */
const initializeSocketServer = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    // Send current game state to new client
    socket.emit('gameState', gameService.getGameState());
    
    // Handle player bet
    socket.on('placeBet', async (data) => {
      try {
        const { playerId, usdAmount, cryptocurrency } = data;
        
        // Validate game is not in progress
        const gameState = gameService.getGameState();
        if (gameState.isActive) {
          return socket.emit('error', { message: 'Cannot place bet while game is in progress' });
        }
        
        // Process bet
        const betResult = await walletService.processBet(playerId, usdAmount, cryptocurrency);
        
        socket.emit('betPlaced', betResult);
        io.emit('playerBet', {
          playerId,
          usdAmount,
          cryptocurrency
        });
      } catch (error) {
        console.error('Error placing bet:', error.message);
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle player cashout
    socket.on('cashout', async (data) => {
      try {
        const { playerId, betId } = data;
        
        // Validate game is active
        const gameState = gameService.getGameState();
        if (!gameState.isActive) {
          return socket.emit('error', { message: 'No active game to cash out from' });
        }
        
        // Check if game has crashed
        if (gameService.hasGameCrashed()) {
          return socket.emit('error', { message: 'Game has already crashed' });
        }
        
        // Find the bet
        const bet = await Bet.findOne({
          _id: betId,
          playerId,
          gameId: gameState.gameId,
          status: 'active'
        });
        
        if (!bet) {
          return socket.emit('error', { message: 'Bet not found or already cashed out' });
        }
        
        // Calculate winnings
        const currentMultiplier = gameState.multiplier;
        const winnings = bet.cryptoAmount * currentMultiplier;
        
        console.log(`Processing cashout for player ${playerId}, bet ${betId}, multiplier ${currentMultiplier}x, winnings ${winnings} ${bet.cryptocurrency}`);
        
        // Update bet status
        bet.status = 'cashed_out';
        bet.cashoutMultiplier = currentMultiplier;
        bet.cashoutAmount = winnings;
        bet.cashoutTimestamp = new Date();
        bet.transactionHash = walletService.generateTransactionHash();
        await bet.save();
        
        // Process cashout
        const cashoutResult = await walletService.processCashout(
          playerId,
          betId,
          winnings,
          bet.cryptocurrency,
          currentMultiplier
        );
        
        console.log('Cashout processed successfully:', cashoutResult);
        
        // Notify player and all clients
        socket.emit('cashoutSuccess', cashoutResult);
        io.emit('playerCashout', {
          playerId,
          multiplier: currentMultiplier,
          cryptoAmount: winnings,
          usdEquivalent: cashoutResult.usdEquivalent,
          cryptocurrency: bet.cryptocurrency
        });
      } catch (error) {
        console.error('Error cashing out:', error.message);
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
  
  console.log('Socket.IO server initialized');
  return io;
};

/**
 * Broadcast game start event
 * @param {Object} game - Game object
 */
const broadcastGameStart = (game) => {
  if (!io) return;
  
  io.emit('gameStart', {
    gameId: game._id,
    roundId: game.roundId,
    startTime: game.startTime
  });
  
  // Start sending multiplier updates
  startMultiplierUpdates();
};

/**
 * Broadcast game end event
 * @param {Object} game - Game object
 */
const broadcastGameEnd = (game) => {
  if (!io) return;
  
  io.emit('gameEnd', {
    gameId: game._id,
    roundId: game.roundId,
    crashPoint: game.crashPoint
  });
  
  // Stop multiplier updates
  stopMultiplierUpdates();
};

/**
 * Start sending multiplier updates to all clients
 */
const startMultiplierUpdates = () => {
  if (multiplierInterval) {
    clearInterval(multiplierInterval);
  }
  
  multiplierInterval = setInterval(() => {
    const gameState = gameService.getGameState();
    
    if (!gameState.isActive) {
      stopMultiplierUpdates();
      return;
    }
    
    io.emit('multiplierUpdate', {
      multiplier: gameState.multiplier,
      elapsedMs: gameState.elapsedMs
    });
    
    // Check if game should crash
    if (gameService.hasGameCrashed()) {
      gameService.endGame()
        .then(game => broadcastGameEnd(game))
        .catch(error => console.error('Error ending game:', error.message));
    }
  }, MULTIPLIER_UPDATE_INTERVAL);
};

/**
 * Stop sending multiplier updates
 */
const stopMultiplierUpdates = () => {
  if (multiplierInterval) {
    clearInterval(multiplierInterval);
    multiplierInterval = null;
  }
};

module.exports = {
  initializeSocketServer,
  broadcastGameStart,
  broadcastGameEnd
};
