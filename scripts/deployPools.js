import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool as UniswapPool, FeeAmount } from "@uniswap/v3-sdk";
import { Pool as PancakeSwapPool } from "@pancakeswap/v3-sdk";
import 'dotenv/config';

// Constants and configurations
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// Factory addresses for Arbitrum Sepolia
const FACTORY_ADDRESSES = {
    uniswap: "0xba5973d0d236f7f03a8c3bd262375c2795f2c7b4",
    pancakeswap: "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E"
};

// Complete Factory ABI with events and errors
const FACTORY_ABI = [
    "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    "function owner() external view returns (address)",
    "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
    "error PoolAlreadyExists()",
    "error ZeroAddressNotAllowed()",
    "error TokensMustBeDifferent()",
    "error UnsupportedFeeAmount(uint24 fee)"
];

// Token Configurations
const TOKENS = {
    WETH: new Token(
        ARBITRUM_SEPOLIA_CHAIN_ID,
        "0x980b62da83eff3d4576c647993b0c1d7faf17c73",
        18,
        "WETH"
    ),
    USDC: new Token(
        ARBITRUM_SEPOLIA_CHAIN_ID,
        "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        6,
        "USDC"
    )
};

// Provider Setup
const setupProvider = () => {
    if (!process.env.ARBITRUM_SEPOLIA_URL) {
        throw new Error("Missing ARBITRUM_SEPOLIA_URL in environment variables");
    }
    return new ethers.JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_URL, {
        chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
        name: "arbitrum-sepolia"
    });
};

// Wallet Setup
const setupWallet = (provider) => {
    if (!process.env.PRIVATE_KEY) {
        throw new Error("Missing PRIVATE_KEY in environment variables");
    }
    return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
};

// Utility function to validate fee amount
const validateFeeAmount = (fee) => {
    const supportedFees = [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];
    if (!supportedFees.includes(fee)) {
        throw new Error(`Unsupported fee amount: ${fee}`);
    }
};

// Pool Deployment Function
async function deployPool(dex, tokenA, tokenB, fee, wallet) {  // Added wallet parameter
    // Validate inputs
    if (!FACTORY_ADDRESSES[dex]) {
        throw new Error(`Unsupported DEX: ${dex}`);
    }
    validateFeeAmount(fee);

    const factoryContract = new ethers.Contract(
        FACTORY_ADDRESSES[dex],
        FACTORY_ABI,
        wallet
    );

    // Sort tokens according to protocol requirements
    const [token0, token1] = 
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
            ? [tokenA, tokenB] 
            : [tokenB, tokenA];

    // Check for existing pool
    const existingPool = await factoryContract.getPool(token0.address, token1.address, fee);
    if (existingPool !== "0x0000000000000000000000000000000000000000") {
        console.log(`${dex.toUpperCase()} pool already exists at ${existingPool}`);
        return existingPool;
    }

    console.log(`Deploying ${dex.toUpperCase()} pool...`);
    console.log(`Token0: ${token0.address}`);
    console.log(`Token1: ${token1.address}`);
    console.log(`Fee: ${fee}`);

    try {
        // Create pool with optimized gas settings for Arbitrum
        const tx = await factoryContract.createPool(
            token0.address,
            token1.address,
            fee,
            {
                gasLimit: 5000000,
                maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei"),
                maxFeePerGas: ethers.parseUnits("0.1", "gwei")
            }
        );

        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error("Transaction failed");
        }

        // Verify pool creation through events
        const poolCreatedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.id("PoolCreated(address,address,uint24,int24,address)")
        );

        if (!poolCreatedEvent) {
            throw new Error("Pool creation event not found in transaction logs");
        }

        // Get and verify the new pool address
        const poolAddress = await factoryContract.getPool(token0.address, token1.address, fee);
        if (poolAddress === "0x0000000000000000000000000000000000000000") {
            throw new Error("Pool address verification failed");
        }

        console.log(`✅ ${dex.toUpperCase()} Pool deployed successfully`);
        console.log(`Pool Address: ${poolAddress}`);
        return poolAddress;

    } catch (error) {
        console.error(`Failed to deploy ${dex} pool:`, {
            error: error.message,
            token0: token0.address,
            token1: token1.address,
            fee: fee,
            dex: dex
        });
        throw error;
    }
}

// Main execution
async function main() {
    try {
        const provider = setupProvider();
        const wallet = setupWallet(provider);

        // Deploy Uniswap pool
        console.log("\n--- Deploying Uniswap Pool ---");
        await deployPool("uniswap", TOKENS.WETH, TOKENS.USDC, FeeAmount.MEDIUM, wallet);

        // Deploy PancakeSwap pool
        console.log("\n--- Deploying PancakeSwap Pool ---");
        await deployPool("pancakeswap", TOKENS.WETH, TOKENS.USDC, FeeAmount.MEDIUM, wallet);

    } catch (error) {
        console.error("Deployment Failed:", error.message);
        process.exit(1);
    }
}

// Execute with proper error handling
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});