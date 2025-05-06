const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  wallets: {
    bitcoin: {
      balance: {
        type: Number,
        default: 0
      }
    },
    ethereum: {
      balance: {
        type: Number,
        default: 0
      }
    },
    usd: {
      balance: {
        type: Number,
        default: 1000 // Start with $1000 for testing
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Player', PlayerSchema);
