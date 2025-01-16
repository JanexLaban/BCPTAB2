const hre = require("hardhat");

async function main() {
    const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");

    const lendingPoolAddress = "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A"; // Replace with Aave Sepolia testnet lending pool address
    const uniswapRouterAddress = "0x..."; // Replace with Uniswap Sepolia router address
    const pancakeSwapRouterAddress = "0x..."; // Replace with PancakeSwap Sepolia router address

    const slippageTolerance = 50; // 0.5%

    const arbitrageContract = await FlashLoanArbitrage.deploy(
        lendingPoolAddress,
        uniswapRouterAddress,
        pancakeSwapRouterAddress,
        slippageTolerance
    );

    await arbitrageContract.deployed();

    console.log(`FlashLoanArbitrage deployed to: ${arbitrageContract.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
