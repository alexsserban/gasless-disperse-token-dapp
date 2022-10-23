import { useConnectWallet } from "@web3-onboard/react";
import { Biconomy } from "@biconomy/mexa";

const UseBiconomy = () => {
  const [{ wallet }] = useConnectWallet();

  const getBiconomy = async (contract: string) => {
    if (!wallet) return;

    const biconomy = new Biconomy(wallet.provider, {
      apiKey: process.env.NEXT_PUBLIC_BICONOMY_KEY,
      contractAddresses: [contract],
      strictMode: false,
    });

    await biconomy.init();
    return biconomy;
  };

  return { getBiconomy };
};

export default UseBiconomy;
