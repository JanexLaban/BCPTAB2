// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FlashLoanArbitrage is ReentrancyGuard {
    IPool public lendingPool;
    IUniswapV2Router02 public uniswapRouter;
    IUniswapV2Router02 public pancakeSwapRouter;
    uint256 public slippageTolerance; // In basis points (e.g., 50 = 0.5%)

    event SwapExecuted(address router, address token, uint256 inputAmount, uint256 outputAmount);
    event ArbitragePerformed(address token, uint256 profit);

    constructor(
        address _lendingPool,
        address _uniswapRouter,
        address _pancakeSwapRouter,
        uint256 _slippageTolerance
    ) {
        lendingPool = IPool(_lendingPool);
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        pancakeSwapRouter = IUniswapV2Router02(_pancakeSwapRouter);
        slippageTolerance = _slippageTolerance; // Set slippage tolerance
    }

    function executeFlashLoan(address token, uint256 amount) external nonReentrant {
        lendingPool.flashLoan(
            address(this),
            token,
            amount,
            ""
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external nonReentrant returns (bool) {
        require(msg.sender == address(lendingPool), "Unauthorized caller");

        // Perform arbitrage logic
        uint256 profit = performArbitrage(asset, amount);

        require(profit > 0, "No arbitrage opportunity found");
        emit ArbitragePerformed(asset, profit);

        // Repay the flash loan with premium
        IERC20(asset).approve(address(lendingPool), amount + premium);

        return true;
    }

    function performArbitrage(address token, uint256 amount) internal returns (uint256 profit) {
        address;
        path[0] = token;
        path[1] = uniswapRouter.WETH(); // Assuming WETH as the intermediate token

        // Get prices on both platforms
        uint256[] memory uniswapAmounts = uniswapRouter.getAmountsOut(amount, path);
        uint256[] memory pancakeSwapAmounts = pancakeSwapRouter.getAmountsOut(amount, path);

        uint256 uniswapPrice = uniswapAmounts[1];
        uint256 pancakeSwapPrice = pancakeSwapAmounts[1];

        // Calculate slippage-protected minimum amounts
        uint256 minAmountOut = (uniswapPrice * (10000 - slippageTolerance)) / 10000;

        if (uniswapPrice > pancakeSwapPrice) {
            profit = uniswapPrice - pancakeSwapPrice;
            uint256 profitMargin = (profit * 100) / pancakeSwapPrice;

            if (profitMargin >= 1.5 ether / 1e18) { // Ensure 1.5% profit margin
                // Buy from PancakeSwap and sell on Uniswap
                executeSwap(pancakeSwapRouter, token, amount, minAmountOut);
                executeSwap(uniswapRouter, token, amount, minAmountOut);
            }
        } else if (pancakeSwapPrice > uniswapPrice) {
            profit = pancakeSwapPrice - uniswapPrice;
            uint256 profitMargin = (profit * 100) / uniswapPrice;

            if (profitMargin >= 1.5 ether / 1e18) { // Ensure 1.5% profit margin
                // Buy from Uniswap and sell on PancakeSwap
                executeSwap(uniswapRouter, token, amount, minAmountOut);
                executeSwap(pancakeSwapRouter, token, amount, minAmountOut);
            }
        }
    }

    function executeSwap(
        IUniswapV2Router02 router,
        address token,
        uint256 amount,
        uint256 minAmountOut
    ) internal {
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient token balance");

        address;
        path[0] = token;
        path[1] = router.WETH();

        IERC20(token).approve(address(router), amount);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amount,
            minAmountOut, // Minimum output with slippage protection
            path,
            address(this),
            block.timestamp
        );

        emit SwapExecuted(address(router), token, amount, amounts[1]);
    }

    function setSlippageTolerance(uint256 _slippageTolerance) external {
        require(_slippageTolerance <= 1000, "Slippage tolerance too high"); // Max 10%
        slippageTolerance = _slippageTolerance;
    }
}
