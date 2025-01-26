import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool as UniswapPool, FeeAmount } from "@uniswap/v3-sdk";
import { Pool as Pancak0x980b62da83eff3d4576c647993b0c1d7faf17c73eSwapPool } from "@pancakeswap/v3-sdk";
import 'dotenv/config';

// 1. Provider Setup
const provider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_SEPOLIA_URL,
  { chainId: 421614, name: "arbitrum-sepolia" }
);

// 2. Token Setup (Arbitrum Sepolia)
const WETH = new Token(
  421614,
  "", // Verified
  18,
  "WETH"
);

const USDC = new Token(
  421614,
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Verified
  6,
  "USDC"
);

// 3. DEX Configuration
const DEX_CONFIG = {
  uniswap: {
    factory: "0xBA5973D0D236F7f03A8C3bd262375C2795F2c7B4",
    poolClass: UniswapPool
  },
  pancakeswap: {
    factory: "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E",
    poolClass: PancakeSwapPool
  }
};

async function getPoolPrice(dex, tokenA, tokenB) {
  try {
    const { factory, poolClass } = DEX_CONFIG[dex];
    const poolAddr = poolClass.getAddress(tokenA, tokenB, FeeAmount.MEDIUM, factory);
    
    const poolContract = new ethers.Contract(poolAddr, [
      "function slot0() view returns (uint160 sqrtPriceX96)"
    ], provider);

    const { sqrtPriceX96 } = await poolContract.slot0();
    return Number(sqrtPriceX96.toString());
  } catch (error) {
    console.log(`⚠️ ${dex.toUpperCase()} Error:`, error.shortMessage || "Pool not found");
    return null;
  }
}

// 4. Main Execution
async function monitorArbitrage() {
  const [uniPrice, cakePrice] = await Promise.all([
    getPoolPrice("uniswap", WETH, USDC),
    getPoolPrice("pancakeswap", WETH, USDC)
  ]);

  if (!uniPrice || !cakePrice) {
    console.log("❌ Price data unavailable");
    return;
  }

  const spread = ((Math.abs(uniPrice - cakePrice) / Math.min(uniPrice, cakePrice)) * 100).toFixed(2);
  console.log(`Uniswap: ${uniPrice}, PancakeSwap: ${cakePrice} | Spread: ${spread}%`);

  if (spread >= 1.5) {
    console.log("🚀 Triggering arbitrage...");
    // Flash loan logic here (Lesson 4)
  }
}

// Run every 60 seconds
setInterval(monitorArbitrage, 60000);
monitorArbitrage();