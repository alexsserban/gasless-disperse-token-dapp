import { ethers } from "hardhat";

async function main() {
  if (!process.env.BICONOMY_TRUSTED_FORWARDER) throw new Error("Biconomy trusted forwarder address not set!");

  const disperseFactory = await ethers.getContractFactory("DisperseGasless");
  const disperse = await disperseFactory.deploy(process.env.BICONOMY_TRUSTED_FORWARDER);

  await disperse.deployed();
  console.log("Gasless Disperse deployed to:", disperse.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
