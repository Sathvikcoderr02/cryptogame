const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  roundId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  crashPoint: {
    type: Number,
    required: true
  },
  seed: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  },
  cryptoPrices: {
    bitcoin: Number,
    ethereum: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', GameSchema);
