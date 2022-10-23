import { ethers } from "ethers";

const ZERO_BN = ethers.BigNumber.from(0);

const handle = <T>(promise: Promise<T>) => {
  return promise
    .then((data: T) => ({
      data,
      err: undefined,
    }))
    .catch((err: any) => Promise.resolve({ data: undefined, err }));
};

const getReadableBN = (bn: ethers.BigNumber, decimals?: number) =>
  parseFloat(ethers.utils.formatUnits(bn, decimals || 18)).toLocaleString("en-US", { maximumFractionDigits: 6 });

export { ZERO_BN, handle, getReadableBN };
