const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  usdAmount: {
    type: Number,
    required: true
  },
  cryptoAmount: {
    type: Number,
    required: true
  },
  cryptocurrency: {
    type: String,
    enum: ['bitcoin', 'ethereum'],
    required: true
  },
  cryptoPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cashed_out', 'lost'],
    default: 'active'
  },
  cashoutMultiplier: {
    type: Number
  },
  cashoutAmount: {
    type: Number
  },
  cashoutTimestamp: {
    type: Date
  },
  transactionHash: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bet', BetSchema);
