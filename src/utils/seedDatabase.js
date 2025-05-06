const mongoose = require('mongoose');
const config = require('../config/config');
const Player = require('../models/Player');
const Game = require('../models/Game');
const Bet = require('../models/Bet');
const Transaction = require('../models/Transaction');
const crypto = require('crypto');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Generate a mock transaction hash
const generateTransactionHash = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate a provably fair crash point
const generateCrashPoint = (seed, roundId) => {
  const combinedString = `${seed}-${roundId}`;
  const hash = crypto.createHash('sha256').update(combinedString).digest('hex');
  
  const hexValue = hash.substring(0, 8);
  const decimalValue = parseInt(hexValue, 16);
  
  const maxDecimal = parseInt('ffffffff', 16);
  const crashPoint = 1 + (decimalValue / maxDecimal) * 99;
  
  return {
    crashPoint: parseFloat(crashPoint.toFixed(2)),
    seed,
    hash
  };
};

// Seed the database with sample data
const seedDatabase = async () => {
  try {
    // Clear existing data
    await Player.deleteMany({});
    await Game.deleteMany({});
    await Bet.deleteMany({});
    await Transaction.deleteMany({});
    
    console.log('Database cleared');
    
    // Create sample players
    const players = [];
    const playerNames = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'];
    
    for (const name of playerNames) {
      const player = new Player({
        username: name,
        wallets: {
          bitcoin: { balance: parseFloat((Math.random() * 0.01).toFixed(8)) },
          ethereum: { balance: parseFloat((Math.random() * 0.1).toFixed(8)) },
          usd: { balance: 1000 }
        }
      });
      
      await player.save();
      players.push(player);
      console.log(`Created player: ${name}`);
    }
    
    // Create sample games
    const games = [];
    const cryptoPrices = {
      bitcoin: 60000,
      ethereum: 3000
    };
    
    for (let i = 0; i < 10; i++) {
      const roundId = `round-${Date.now() - (i * 60000)}`;
      const seed = crypto.randomBytes(16).toString('hex');
      const { crashPoint, hash } = generateCrashPoint(seed, roundId);
      
      const game = new Game({
        roundId,
        startTime: new Date(Date.now() - (i * 60000)),
        endTime: new Date(Date.now() - (i * 60000) + 20000),
        crashPoint,
        seed,
        hash,
        status: 'completed',
        cryptoPrices
      });
      
      await game.save();
      games.push(game);
      console.log(`Created game: ${roundId} with crash point ${crashPoint}x`);
    }
    
    // Create sample bets and transactions
    for (const game of games) {
      // Random number of bets per game
      const numBets = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < numBets; i++) {
        // Random player
        const player = players[Math.floor(Math.random() * players.length)];
        
        // Random bet amount
        const usdAmount = Math.floor(Math.random() * 50) + 10;
        
        // Random cryptocurrency
        const cryptocurrency = Math.random() > 0.5 ? 'bitcoin' : 'ethereum';
        
        // Calculate crypto amount
        const cryptoPrice = cryptoPrices[cryptocurrency];
        const cryptoAmount = usdAmount / cryptoPrice;
        
        // Determine if bet was cashed out or lost
        const didCashout = Math.random() > 0.3; // 70% chance of cashing out
        
        // If cashed out, determine at what multiplier
        let cashoutMultiplier = null;
        let cashoutAmount = null;
        let cashoutTimestamp = null;
        
        if (didCashout) {
          cashoutMultiplier = parseFloat((Math.random() * (game.crashPoint - 1) + 1).toFixed(2));
          cashoutAmount = cryptoAmount * cashoutMultiplier;
          cashoutTimestamp = new Date(game.startTime.getTime() + (cashoutMultiplier - 1) * 5000);
        }
        
        // Create bet
        const bet = new Bet({
          playerId: player._id,
          gameId: game._id,
          usdAmount,
          cryptoAmount,
          cryptocurrency,
          cryptoPrice,
          status: didCashout ? 'cashed_out' : 'lost',
          cashoutMultiplier,
          cashoutAmount,
          cashoutTimestamp,
          transactionHash: didCashout ? generateTransactionHash() : null
        });
        
        await bet.save();
        
        // Create transaction for bet
        const betTransaction = new Transaction({
          playerId: player._id,
          betId: bet._id,
          usdAmount,
          cryptoAmount,
          cryptocurrency,
          transactionType: 'bet',
          transactionHash: generateTransactionHash(),
          priceAtTime: cryptoPrice,
          timestamp: game.startTime
        });
        
        await betTransaction.save();
        
        // Create transaction for cashout if applicable
        if (didCashout) {
          const cashoutTransaction = new Transaction({
            playerId: player._id,
            betId: bet._id,
            usdAmount: usdAmount * cashoutMultiplier,
            cryptoAmount: cashoutAmount,
            cryptocurrency,
            transactionType: 'cashout',
            transactionHash: generateTransactionHash(),
            priceAtTime: cryptoPrice,
            timestamp: cashoutTimestamp
          });
          
          await cashoutTransaction.save();
        }
        
        console.log(`Created bet for ${player.username} in game ${game.roundId}: $${usdAmount} in ${cryptocurrency}`);
        if (didCashout) {
          console.log(`  Cashed out at ${cashoutMultiplier}x for ${cashoutAmount.toFixed(8)} ${cryptocurrency}`);
        } else {
          console.log(`  Lost bet`);
        }
      }
    }
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

// Run the seed function
connectDB().then(() => {
  seedDatabase();
});
