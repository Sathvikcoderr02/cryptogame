# Crypto Crash Game

A real-time multiplayer "Crash" betting game with cryptocurrency integration. Players bet in USD, which is converted to cryptocurrency (BTC or ETH) using real-time prices. They watch a multiplier increase and decide when to cash out before the game crashes.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Provably Fair Algorithm](#provably-fair-algorithm)
- [USD-to-Crypto Conversion](#usd-to-crypto-conversion)
- [Project Overview](#project-overview)
- [Sample Data](#sample-data)
- [License](#license)

## Features

- **Game Logic**: Provably fair crash algorithm with verifiable results
- **Cryptocurrency Integration**: Real-time price fetching from CoinGecko API
- **WebSocket Implementation**: Real-time multiplayer updates and game state
- **Player Wallet System**: Simulated cryptocurrency wallets with USD conversion
- **Transaction Logging**: Detailed logs of all bets, cashouts, and game results

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **Cryptocurrency API**: CoinGecko API

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Git

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd cryptogame
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/cryptogame
   CRYPTO_API_KEY=CG-Dkdg2euzJjwKHmHSj5qUF8p1
   CRYPTO_API_URL=https://api.coingecko.com/api/v3
   GAME_INTERVAL=20000
   ```
   
   Notes:
   - `CRYPTO_API_KEY`: This is a demo API key for CoinGecko. For production use, you should register for your own API key at [CoinGecko](https://www.coingecko.com/en/api).
   - `GAME_INTERVAL`: Time in milliseconds between game rounds (20 seconds by default).

4. Start MongoDB:
   Make sure MongoDB is running on your system. If using a local installation:
   ```
   mongod
   ```

5. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

6. Access the application:
   - Web interface: http://localhost:3000
   - API endpoints: http://localhost:3000/api

## API Endpoints

### Player Endpoints

#### Create a new player
- **URL**: `/api/players`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Player created successfully",
    "player": {
      "id": "string",
      "username": "string",
      "wallets": {
        "bitcoin": { "balance": 0 },
        "ethereum": { "balance": 0 },
        "usd": { "balance": 1000 }
      }
    }
  }
  ```

#### Get all players
- **URL**: `/api/players`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "count": 0,
    "players": [
      {
        "id": "string",
        "username": "string",
        "wallets": {
          "bitcoin": { "balance": 0 },
          "ethereum": { "balance": 0 },
          "usd": { "balance": 0 }
        }
      }
    ]
  }
  ```

#### Get player by ID
- **URL**: `/api/players/:id`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "player": {
      "id": "string",
      "username": "string",
      "wallets": {
        "bitcoin": { "balance": 0 },
        "ethereum": { "balance": 0 },
        "usd": { "balance": 0 }
      }
    }
  }
  ```

#### Get player wallet balance
- **URL**: `/api/players/:id/wallet`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "wallets": {
      "bitcoin": {
        "balance": 0,
        "usdEquivalent": 0
      },
      "ethereum": {
        "balance": 0,
        "usdEquivalent": 0
      },
      "usd": {
        "balance": 0
      }
    },
    "totalUsdValue": 0
  }
  ```

### Game Endpoints

#### Get current game state
- **URL**: `/api/games/state`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "isActive": false,
    "nextGameIn": 0
  }
  ```
  or if game is active:
  ```json
  {
    "isActive": true,
    "gameId": "string",
    "roundId": "string",
    "multiplier": 1.5,
    "elapsedMs": 1000,
    "startTime": "timestamp"
  }
  ```

#### Get game history
- **URL**: `/api/games/history`
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (default: 10)
  - `page` (default: 1)
- **Response**:
  ```json
  {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0,
    "games": [
      {
        "id": "string",
        "roundId": "string",
        "startTime": "timestamp",
        "endTime": "timestamp",
        "crashPoint": 0,
        "hash": "string"
      }
    ]
  }
  ```

#### Get game details by ID
- **URL**: `/api/games/:id`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "game": {
      "id": "string",
      "roundId": "string",
      "startTime": "timestamp",
      "endTime": "timestamp",
      "crashPoint": 0,
      "status": "string",
      "hash": "string",
      "seed": "string",
      "cryptoPrices": {
        "bitcoin": 0,
        "ethereum": 0
      }
    },
    "bets": [
      {
        "id": "string",
        "player": {
          "id": "string",
          "username": "string"
        },
        "usdAmount": 0,
        "cryptoAmount": 0,
        "cryptocurrency": "string",
        "status": "string",
        "cashoutMultiplier": 0,
        "cashoutAmount": 0,
        "cashoutTimestamp": "timestamp"
      }
    ]
  }
  ```

#### Place a bet
- **URL**: `/api/games/bet`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "playerId": "string",
    "usdAmount": 0,
    "cryptocurrency": "bitcoin|ethereum"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Bet placed successfully",
    "bet": {
      "id": "string",
      "playerId": "string",
      "gameId": "string",
      "roundId": "string",
      "usdAmount": 0,
      "cryptoAmount": 0,
      "cryptocurrency": "string",
      "cryptoPrice": 0,
      "status": "active"
    },
    "walletUpdate": {
      "newUsdBalance": 0
    }
  }
  ```

#### Cash out from active game
- **URL**: `/api/games/cashout`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "playerId": "string",
    "betId": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Cashout successful",
    "cashout": {
      "betId": "string",
      "playerId": "string",
      "multiplier": 0,
      "cryptoAmount": 0,
      "cryptocurrency": "string",
      "timestamp": "timestamp",
      "walletUpdate": {
        "newCryptoBalance": 0
      }
    }
  }
  ```

#### Verify game fairness
- **URL**: `/api/games/:id/verify`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "gameId": "string",
    "roundId": "string",
    "seed": "string",
    "hash": "string",
    "storedCrashPoint": 0,
    "calculatedCrashPoint": 0,
    "isValid": true
  }
  ```

## WebSocket Events

### Server to Client Events

#### gameState
Sent when a client connects or requests the current game state.
```json
{
  "isActive": true,
  "gameId": "string",
  "roundId": "string",
  "multiplier": 1.5,
  "elapsedMs": 1000,
  "startTime": "timestamp"
}
```

#### gameStart
Sent when a new game round starts.
```json
{
  "gameId": "string",
  "roundId": "string",
  "startTime": "timestamp"
}
```

#### multiplierUpdate
Sent every 100ms during an active game to update the multiplier.
```json
{
  "multiplier": 1.5,
  "elapsedMs": 1000
}
```

#### playerCashout
Sent when a player cashes out.
```json
{
  "playerId": "string",
  "multiplier": 1.5,
  "cryptoAmount": 0,
  "usdEquivalent": 0,
  "cryptocurrency": "string"
}
```

#### gameEnd
Sent when the game crashes.
```json
{
  "gameId": "string",
  "roundId": "string",
  "crashPoint": 2.5
}
```

#### error
Sent when an error occurs.
```json
{
  "message": "string"
}
```

#### cashoutSuccess
Sent to the player who successfully cashed out.
```json
{
  "playerId": "string",
  "betId": "string",
  "cryptoAmount": 0,
  "usdEquivalent": 0,
  "cryptocurrency": "string",
  "multiplier": 0,
  "transactionHash": "string"
}
```

### Client to Server Events

#### placeBet
Sent by client to place a bet.
```json
{
  "playerId": "string",
  "usdAmount": 0,
  "cryptocurrency": "bitcoin|ethereum"
}
```

#### cashout
Sent by client to cash out from an active game.
```json
{
  "playerId": "string",
  "betId": "string"
}
```

## Provably Fair Algorithm

The Crypto Crash game uses a provably fair algorithm to determine crash points, ensuring that game outcomes cannot be manipulated and are verifiable by players.

### How It Works

1. **Seed Generation**: For each game round, a random seed is generated using cryptographically secure random bytes.
   ```javascript
   const seed = crypto.randomBytes(16).toString('hex');
   ```

2. **Hash Creation**: The seed is combined with the round ID and hashed using SHA-256.
   ```javascript
   const combinedString = `${seed}-${roundId}`;
   const hash = crypto.createHash('sha256').update(combinedString).digest('hex');
   ```

3. **Crash Point Calculation**: The first 8 characters of the hash are converted to a decimal value, which is then scaled to determine the crash point.
   ```javascript
   const hexValue = hash.substring(0, 8);
   const decimalValue = parseInt(hexValue, 16);
   const maxDecimal = parseInt('ffffffff', 16);
   const crashPoint = 1 + (decimalValue / maxDecimal) * 99;
   ```

4. **Verification**: After the game ends, the seed is revealed to players, allowing them to verify that the crash point was calculated correctly using the same algorithm.

### Ensuring Fairness

1. **Unpredictable Seeds**: The seed is generated using a cryptographically secure random number generator, making it impossible to predict.
2. **Transparency**: The hash is published before the game starts, committing to a crash point without revealing it.
3. **Verifiability**: After the game ends, players can verify the crash point by recalculating it using the revealed seed.
4. **Immutability**: Once the hash is published, the crash point cannot be changed without detection.

## USD-to-Crypto Conversion

The game converts between USD and cryptocurrencies using real-time market prices.

### Price Fetching

1. **API Integration**: The game uses the CoinGecko API to fetch real-time prices for Bitcoin and Ethereum.
   ```javascript
   const response = await axios.get(
     `${config.cryptoApiUrl}/simple/price?ids=bitcoin,ethereum&vs_currencies=usd`,
     {
       headers: {
         'x-cg-demo-api-key': config.cryptoApiKey
       }
     }
   );
   ```

2. **Price Caching**: Prices are cached for 10 seconds to avoid excessive API calls and rate limiting.
   ```javascript
   const CACHE_EXPIRATION = 10000; // 10 seconds
   ```

3. **Fallback Mechanism**: If the API fails, the system falls back to cached prices to ensure the game continues to function.

### Conversion Logic

1. **USD to Crypto**: When a player places a bet, the USD amount is converted to cryptocurrency.
   ```javascript
   const cryptoAmount = usdAmount / cryptoPrice;
   ```
   Example: If a player bets $10 and the BTC price is $60,000, they receive 0.00016667 BTC.

2. **Crypto to USD**: When a player cashes out, their cryptocurrency winnings are converted back to USD for display.
   ```javascript
   const usdAmount = cryptoAmount * cryptoPrice;
   ```
   Example: If a player wins 0.00033334 BTC and the BTC price is $60,000, they receive $20.

3. **Wallet Updates**: The player's cryptocurrency wallet is updated with their winnings, while the USD equivalent is calculated for display purposes.

## Project Overview

### Game Logic

The game logic is implemented in a modular architecture:

1. **Game Service**: Manages game state, crash points, and multiplier calculations.
   - Starts new game rounds at regular intervals
   - Calculates the current multiplier based on elapsed time
   - Determines when the game crashes
   - Tracks game history and results

2. **Bet Management**: Handles player bets and cashouts.
   - Validates bet amounts and timing
   - Processes cashouts and calculates winnings
   - Updates player wallets and game state

3. **Provably Fair System**: Ensures game fairness and transparency.
   - Generates verifiable crash points
   - Provides verification endpoints for players

### Cryptocurrency Integration

The cryptocurrency integration is handled by:

1. **Crypto API Service**: Fetches and caches real-time cryptocurrency prices.
   - Integrates with CoinGecko API
   - Implements caching to avoid rate limits
   - Provides fallback mechanisms for API failures

2. **Wallet Service**: Manages player wallets and transactions.
   - Tracks balances in USD and cryptocurrencies
   - Processes bet deductions and cashout additions
   - Simulates blockchain transactions with mock hashes

3. **Transaction Logging**: Records all cryptocurrency transactions.
   - Logs bet and cashout transactions
   - Stores transaction details including amounts, prices, and timestamps

### WebSocket Implementation

The real-time multiplayer experience is powered by:

1. **Socket Service**: Manages WebSocket connections and events.
   - Handles client connections and disconnections
   - Broadcasts game events to all players
   - Processes cashout requests in real-time

2. **Real-time Updates**: Provides instant feedback to players.
   - Updates multiplier every 100ms
   - Notifies all players of cashouts and crashes
   - Ensures synchronization across all clients

3. **Game State Synchronization**: Keeps all players in sync with the current game state.
   - Sends current game state to new connections
   - Broadcasts game start and end events
   - Ensures all players see the same multiplier

## Sample Data

To populate the database with sample data:

1. Run the seed script:
   ```
   node src/utils/seedDatabase.js
   ```

This will create:
- 5 sample players with random balances
- 10 sample game rounds with random crash points
- Random bets and cashouts for each game

## License

MIT
