const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  betId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bet'
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
  transactionType: {
    type: String,
    enum: ['bet', 'cashout'],
    required: true
  },
  transactionHash: {
    type: String,
    required: true
  },
  priceAtTime: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
