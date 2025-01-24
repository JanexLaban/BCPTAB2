import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";

const UNISWAP_FACTORY = "0xBA5973D0D236F7f03A8C3bd262375C2795F2c7B4";
const PANCAKE_FACTORY = "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E";

async function deployPool(dex, tokenA, tokenB, fee) {
  const factoryABI = ["function createPool(address,address,uint24) returns (address)"];
  const factoryContract = new ethers.Contract(
    dex === "uniswap" ? UNISWAP_FACTORY : PANCAKE_FACTORY,
    factoryABI,
    wallet
  );
  
  const tx = await factoryContract.createPool(tokenA.address, tokenB.address, fee);
  await tx.wait();
  return await factoryContract.getPool(tokenA.address, tokenB.address, fee);
}