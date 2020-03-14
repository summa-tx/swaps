/* eslint-disable */

require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const infuraKey = process.env.SUMMA_RELAY_DEPLOY_INFURA_KEY;
const mnemonic = process.env.MNEMONIC;

const ropsten = {
  provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/${infuraKey}`),
  network_id: 3,       // Ropsten's id
  gas: 5500000,        // Ropsten has a lower block limit than mainnet
  confirmations: 2,    // # of confs to wait between deployments. (default: 0)
  timeoutBlocks: 200   // # of blocks before a deployment times out  (minimum/default: 50)
}

const kovan = {
  provider: () => new HDWalletProvider(mnemonic, `https://kovan.infura.io/v3/${infuraKey}`),
  network_id: 42,      // Kovan's id
  gas: 5500000,
  confirmations: 2,    // # of confs to wait between deployments. (default: 0)
  timeoutBlocks: 200   // # of blocks before a deployment times out  (minimum/default: 50)
}

const alfajores = {
  host: process.env.ALFAJORES_NODE_URL,
  port: 8545,            // Standard Ethereum port (default: none)
  network_id: 44785,
  port: process.env.ALFAJORES_NODE_PORT,
  from: process.env.ALFAJORES_FROM,
  gas: 8000000,
  gasPrice: 100000000000
}

module.exports = {
  api_keys: {
    etherscan: process.env.ETHERSCAN_KEY
  },
  plugins: [
    'truffle-plugin-verify'
  ],

  networks: {
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },

    alfajores: alfajores,

    ropsten: ropsten,
    ropsten_test: ropsten,

    kovan: kovan,
    kovan_test: kovan,
  },

  // mocha: {
  // },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.10",   // Fetch exact version from solc-bin (default: truffle's version)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
