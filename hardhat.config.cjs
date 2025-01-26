
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 421614
    }
  }
};