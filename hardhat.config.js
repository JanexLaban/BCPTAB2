require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19", // Use the latest stable Solidity version
  networks: {
    hardhat: {}, // Local development network
    rinkeby: {
      url: process.env.SEPOLIA_RPC_URL, // Add Infura endpoint here
      accounts: [process.env.PRIVATE_KEY], // Add your test wallet private key here
    },
  },
};
