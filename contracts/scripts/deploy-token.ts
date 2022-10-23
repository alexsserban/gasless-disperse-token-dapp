import { ethers } from "hardhat";

async function main() {
  const tokenFactory = await ethers.getContractFactory("Token");
  const token = await tokenFactory.deploy("Token", "TKN", 18);

  await token.deployed();
  console.log("Mock ERC20 Token deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
