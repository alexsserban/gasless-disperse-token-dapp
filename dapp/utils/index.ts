import { ethers } from "ethers";

const ZERO_BN = ethers.BigNumber.from(0);

// An alternative way to use async/await without try/catch blocks
const handle = <T>(promise: Promise<T>) => {
  return promise
    .then((data: T) => ({
      data,
      err: undefined,
    }))
    .catch((err: any) => Promise.resolve({ data: undefined, err }));
};

// Parse a Token WEI amount (BigNumber) to a readable string.
const getReadableBN = (bn: ethers.BigNumber, decimals?: number) =>
  parseFloat(ethers.utils.formatUnits(bn, decimals || 18)).toLocaleString("en-US", { maximumFractionDigits: 6 });

export { ZERO_BN, handle, getReadableBN };
