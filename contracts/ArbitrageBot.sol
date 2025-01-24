// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract ArbitrageBot {
    IPool private constant AAVE_POOL = 
        IPool(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951); // Arbitrum Sepolia Pool
    
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
        // ARBITRAGE LOGIC WILL GO HERE (Lesson 3)
        
        uint256 totalOwed = amount + premium;
        IERC20(asset).approve(address(AAVE_POOL), totalOwed);
        return true;
    }

    function requestFlashLoan(address token, uint256 amount) external {
        require(msg.sender == owner, "Unauthorized");
        AAVE_POOL.flashLoanSimple(address(this), token, amount, "", 0);
    }
}