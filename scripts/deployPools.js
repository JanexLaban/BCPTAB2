import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool as UniswapPool, FeeAmount } from "@uniswap/v3-sdk";
import { Pool as PancakeSwapPool } from "@pancakeswap/v3-sdk";
import 'dotenv/config';

// Constants and configurations
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// Updated Factory addresses for Arbitrum Sepolia
const FACTORY_ADDRESSES = {
    // Correct Uniswap V3 Factory address for Arbitrum Sepolia
    uniswap: "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e",
    // PancakeSwap V3 Factory address for Arbitrum Sepolia
    pancakeswap: "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E"
};

// Uniswap V3 Factory Interface
const FACTORY_ABI = {
    uniswap: [
        {
            "inputs": [
                {"internalType": "address", "name": "tokenA", "type": "address"},
                {"internalType": "address", "name": "tokenB", "type": "address"},
                {"internalType": "uint24", "name": "fee", "type": "uint24"}
            ],
            "name": "getPool",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"internalType": "address", "name": "tokenA", "type": "address"},
                {"internalType": "address", "name": "tokenB", "type": "address"},
                {"internalType": "uint24", "name": "fee", "type": "uint24"}
            ],
            "name": "createPool",
            "outputs": [{"internalType": "address", "name": "pool", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],
    pancakeswap: [
        {
            "inputs": [
                {"internalType": "address", "name": "tokenA", "type": "address"},
                {"internalType": "address", "name": "tokenB", "type": "address"},
                {"internalType": "uint24", "name": "fee", "type": "uint24"}
            ],
            "name": "getPool",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"internalType": "address", "name": "tokenA", "type": "address"},
                {"internalType": "address", "name": "tokenB", "type": "address"},
                {"internalType": "uint24", "name": "fee", "type": "uint24"}
            ],
            "name": "createPool",
            "outputs": [{"internalType": "address", "name": "pool", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
};

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

// Provider Setup with retry mechanism
const setupProvider = async () => {
    if (!process.env.ARBITRUM_SEPOLIA_URL) {
        throw new Error("Missing ARBITRUM_SEPOLIA_URL in environment variables");
    }
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_URL);
    
    // Verify provider connection
    try {
        await provider.getNetwork();
        return provider;
    } catch (error) {
        throw new Error(`Failed to connect to network: ${error.message}`);
    }
};

// Wallet Setup
const setupWallet = (provider) => {
    if (!process.env.PRIVATE_KEY) {
        throw new Error("Missing PRIVATE_KEY in environment variables");
    }
    return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
};

// Pool Deployment Function
async function deployPool(dex, tokenA, tokenB, fee, wallet) {
    if (!FACTORY_ADDRESSES[dex]) {
        throw new Error(`Unsupported DEX: ${dex}`);
    }

    console.log(`\nDeploying ${dex.toUpperCase()} pool...`);
    console.log(`Factory Address: ${FACTORY_ADDRESSES[dex]}`);

    const factoryContract = new ethers.Contract(
        FACTORY_ADDRESSES[dex],
        FACTORY_ABI[dex],
        wallet
    );

    // Sort tokens according to protocol requirements
    const [token0, token1] = 
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
            ? [tokenA, tokenB] 
            : [tokenB, tokenA];

    try {
        // First, verify contract existence
        const code = await wallet.provider.getCode(FACTORY_ADDRESSES[dex]);
        if (code === '0x' || code === '0x0') {
            throw new Error(`No contract found at address ${FACTORY_ADDRESSES[dex]}`);
        }

        console.log(`Checking for existing pool...`);
        console.log(`Token0: ${token0.address}`);
        console.log(`Token1: ${token1.address}`);
        console.log(`Fee: ${fee}`);

        let existingPool;
        try {
            existingPool = await factoryContract.getPool(
                token0.address,
                token1.address,
                fee
            );
            console.log(`GetPool response:`, existingPool);
        } catch (error) {
            console.log(`Error checking existing pool:`, error);
            existingPool = ethers.ZeroAddress;
        }

        if (existingPool && existingPool !== ethers.ZeroAddress) {
            console.log(`Pool already exists at ${existingPool}`);
            return existingPool;
        }

        console.log(`Creating new pool...`);
        const tx = await factoryContract.createPool(
            token0.address,
            token1.address,
            fee,
            {
                gasLimit: 5000000
            }
        );

        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (!receipt || receipt.status === 0) {
            throw new Error("Transaction failed");
        }

        // Wait for a few blocks
        console.log("Waiting for pool deployment to be confirmed...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        const newPool = await factoryContract.getPool(
            token0.address,
            token1.address,
            fee
        );

        console.log(`✅ Pool deployed successfully at: ${newPool}`);
        return newPool;

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
        const provider = await setupProvider();
        const wallet = setupWallet(provider);

        const network = await provider.getNetwork();
        console.log(`Connected to network: ${network.name} (${network.chainId})`);

        // Only deploy Uniswap pool for now
        console.log("\n--- Deploying Uniswap Pool ---");
        await deployPool("uniswap", TOKENS.WETH, TOKENS.USDC, FeeAmount.MEDIUM, wallet);

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