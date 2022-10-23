import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

import { handle } from "utils";

import Token from "contracts/artifacts/contracts/Token.sol/Token.json";
import type { Token as IToken } from "contracts/typechain-types/contracts/Token";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.DEPLOYER_PRIVATE_KEY) return res.status(500).json({ error: "Missing DEPLOYER_PRIVATE_KEY" });

  const { tokenAddress, owner, spender, value, deadline, signature } = req.body;
  const maxDeadline = Math.floor(Date.now() / 1000) + 60 * 10;

  if (deadline > maxDeadline) return res.status(500).json({ error: "Deadline is too far in the future" });

  const provider = new ethers.providers.InfuraProvider(process.env.NEXT_PUBLIC_NETWORK, {
    infura: {
      projectId: process.env.NEXT_PUBLIC_INFURA_KEY,
    },
  });

  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const token = new ethers.Contract(tokenAddress, Token.abi, wallet) as IToken;
  const { v, r, s } = ethers.utils.splitSignature(signature as ethers.Signature);

  const permitReq = token.permit(owner, spender, value, deadline, v, r, s);
  const { data, err } = await handle(permitReq);
  if (err || !data || !data.hash) return res.status(500).json({ error: "Can't send permit transaction", reason: err });

  return res.status(200).json({ txHash: data.hash });
}
