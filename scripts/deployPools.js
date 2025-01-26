import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool as UniswapPool, FeeAmount } from "@uniswap/v3-sdk";
import { Pool as PancakeSwapPool } from "@pancakeswap/v3-sdk";
import 'dotenv/config';

// 1. Provider Setup
const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_URL, {
  chainId: 421614,
  name: "arbitrum-sepolia"
});
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 2. Token Setup (Correct Addresses)
const WETH = new Token(
  421614,
  "0x980b62da83eff3d4576c647993b0c1d7faf17c73", // Verified
  18,
  "WETH"
);

const USDC = new Token(
  421614,
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Verified
  6,
  "USDC"
);

// 3. Factory Addresses (Arbitrum Sepolia)
const UNISWAP_FACTORY = "0xBA5973D0D236F7f03A8C3bd262375C2795F2c7B4";
const PANCAKE_FACTORY = "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E";
const factoryABI = [
  "function createPool(address,address,uint24) returns (address)",
  "function getPool(address,address,uint24) view returns (address)"
];

// 4. Deploy Pool Function
async function deployPool(dex, tokenA, tokenB, fee) {
  const factoryAddress = dex === "uniswap" ? UNISWAP_FACTORY : PANCAKE_FACTORY;
  const factoryContract = new ethers.Contract(factoryAddress, factoryABI, wallet);

  // Sort tokens
  const [token0, token1] = 
    tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
      ? [tokenA, tokenB] 
      : [tokenB, tokenA];

  console.log(`Deploying ${dex.toUpperCase()} pool...`);
  const tx = await factoryContract.createPool(token0.address, token1.address, fee);
  const receipt = await tx.wait();

  if (receipt.status === 0) {
    throw new Error("❌ Transaction failed");
  }

  const poolAddress = await factoryContract.getPool(token0.address, token1.address, fee);
  console.log(`✅ ${dex.toUpperCase()} Pool: ${poolAddress}`);
  return poolAddress;
}

// 5. Execute
async function main() {
  try {
    await deployPool("uniswap", WETH, USDC, FeeAmount.MEDIUM);
    await deployPool("pancakeswap", WETH, USDC, FeeAmount.MEDIUM);
  } catch (error) {
    console.error("Deployment Failed:", error.message);
  }
}

main();