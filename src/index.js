const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/database');
const config = require('./config/config');
const socketService = require('./services/socketService');
const gameService = require('./services/gameService');
const cryptoApi = require('./services/cryptoApi');

// Import routes
const playerRoutes = require('./routes/playerRoutes');
const gameRoutes = require('./routes/gameRoutes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/players', playerRoutes);
app.use('/api/games', gameRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketService.initializeSocketServer(server);

// Game scheduler
let gameScheduler;

const startGameScheduler = async () => {
  // Clear any existing scheduler
  if (gameScheduler) {
    clearInterval(gameScheduler);
  }

  // Initialize by fetching crypto prices
  try {
    await cryptoApi.getCryptoPrices();
    console.log('Initial crypto prices fetched successfully');
  } catch (error) {
    console.error('Failed to fetch initial crypto prices:', error.message);
  }

  // Schedule game rounds
  gameScheduler = setInterval(async () => {
    try {
      const gameState = gameService.getGameState();
      
      // If a game is already running, don't start a new one
      if (gameState.isActive) {
        return;
      }
      
      // Start a new game
      const newGame = await gameService.startNewGame();
      socketService.broadcastGameStart(newGame);
      
      // Schedule game end based on crash point
      const elapsedMsUntilCrash = Math.log(newGame.crashPoint) / 0.05 * 1000;
      setTimeout(async () => {
        try {
          const endedGame = await gameService.endGame();
          socketService.broadcastGameEnd(endedGame);
        } catch (error) {
          console.error('Error ending game:', error.message);
        }
      }, elapsedMsUntilCrash);
      
    } catch (error) {
      console.error('Error in game scheduler:', error.message);
    }
  }, config.gameInterval);
  
  console.log(`Game scheduler started with interval of ${config.gameInterval}ms`);
};

// Start the server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startGameScheduler();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (gameScheduler) {
    clearInterval(gameScheduler);
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
