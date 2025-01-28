const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Load contracts
  const arbitrageBot = await ethers.getContractAt(
    "ArbitrageBot",
    process.env.ARBITRAGE_BOT_ADDRESS
  );
  const aavePool = await ethers.getContractAt(
    "IPool",
    process.env.AAVE_POOL_ADDRESS
  );

  // Define loan parameters ($1000 in testnet ETH)
  const loanAmount = ethers.parseEther("1000"); // Adjust for testnet token decimals
  const tokenAddress = "0xYourTokenAddress"; // Replace with your testnet token (e.g., WETH)

  // Trigger flash loan
  const tx = await aavePool.flashLoanSimple(
    arbitrageBot.address,
    tokenAddress,
    loanAmount,
    "0x",
    0
  );
  await tx.wait();
  console.log("Flash loan executed. Check profit!");
}

main();