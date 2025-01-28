import { ethers } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ArbitrageBot = await ethers.getContractFactory("ArbitrageBot");
  const arbitrageBot = await ArbitrageBot.deploy();
  await arbitrageBot.waitForDeployment();

  console.log("ArbitrageBot deployed to:", arbitrageBot.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });