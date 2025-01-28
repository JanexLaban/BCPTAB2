// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract ArbitrageBot {
    IPool private constant AAVE_POOL = 
        IPool(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951); // Arbitrum Sepolia Pool
    
    ISwapRouter private constant UNISWAP_ROUTER = 
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564); // Uniswap V3 Router
    
    ISwapRouter private constant PANCAKE_ROUTER = 
        ISwapRouter(0x1b81D678ffb9C0263b24A97847620C99d213eB14); // PancakeSwap V3 Router

    address private owner;
    
    constructor() {
        owner = msg.sender;
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address, // initiator (unused)
        bytes calldata // params (unused)
    ) external returns (bool) {
        require(msg.sender == address(AAVE_POOL), "Unauthorized");

        // 1. Swap on Uniswap
        IERC20(asset).approve(address(UNISWAP_ROUTER), amount);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: asset,
            tokenOut: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // USDC
            fee: 3000, // 0.3% fee tier
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        uint256 amountOutUniswap = UNISWAP_ROUTER.exactInputSingle(params);

        // 2. Swap on PancakeSwap
        IERC20(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238).approve(address(PANCAKE_ROUTER), amountOutUniswap);
        params = ISwapRouter.ExactInputSingleParams({
            tokenIn: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // USDC
            tokenOut: asset,
            fee: 3000, // 0.3% fee tier
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amountOutUniswap,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        uint256 amountOutPancake = PANCAKE_ROUTER.exactInputSingle(params);

        // 3. Repay flash loan
        uint256 totalOwed = amount + premium;
        require(amountOutPancake >= totalOwed, "Arbitrage failed: Insufficient profit");
        IERC20(asset).approve(address(AAVE_POOL), totalOwed);

        return true;
    }

    function requestFlashLoan(address token, uint256 amount) external {
        require(msg.sender == owner, "Unauthorized");
        AAVE_POOL.flashLoanSimple(address(this), token, amount, "", 0);
    }
}