import { createContext, ReactNode, useCallback, useEffect, useState } from "react";
import { init } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";
import { ethers } from "ethers";

import SVG from "public/apple.svg";

import Disperse from "contracts/artifacts/contracts/Disperse.sol/Disperse.json";
import type { Disperse as IDisperse } from "contracts/typechain-types/Disperse";

const injected = injectedModule();
const onboard = init({
  wallets: [injected],
  chains: [
    {
      id: "0x1",
      token: "ETH",
      label: "Ethereum Mainnet",
      rpcUrl: `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY}`,
    },
    {
      id: "0x5",
      token: "GoerliETH",
      label: "Goerli Testnet",
      rpcUrl: `https://goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY}`,
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_BLOCK_NATIVE_KEY,
  appMetadata: {
    name: "Disperse Dapp",
    icon: SVG,
    description: "Distribute tokens to multiple addresses with gasless transaction",
    recommendedInjectedWallets: [{ name: "MetaMask", url: "https://metamask.io" }],
  },
  accountCenter: {
    desktop: {
      position: "bottomRight",
      enabled: true,
      minimal: true,
    },
    mobile: {
      position: "bottomRight",
      enabled: true,
      minimal: true,
    },
  },
});

const Web3Context = createContext<{
  provider: ethers.providers.InfuraProvider | ethers.providers.BaseProvider | undefined;
  disperse: IDisperse | undefined;
} | null>(null);

const Web3 = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<ethers.providers.InfuraProvider | ethers.providers.BaseProvider>();
  const [disperse, setDisperse] = useState<IDisperse>();

  const initContext = useCallback(async () => {
    /**********************************************************/
    /* Auto-connect to Wallet */
    /**********************************************************/

    const previouslyConnectedWallets = JSON.parse(window.localStorage.getItem("connectedWallets") || "");

    if (previouslyConnectedWallets.length) {
      await onboard.connectWallet({
        autoSelect: { label: previouslyConnectedWallets[0], disableModals: true },
      });
    }

    /**********************************************************/
    /* Save to LocalStorage for re-use */
    /**********************************************************/

    const walletsSub = onboard.state.select("wallets");
    const { unsubscribe } = walletsSub.subscribe((wallets) => {
      const connectedWallets = wallets.map(({ label }) => label);
      window.localStorage.setItem("connectedWallets", JSON.stringify(connectedWallets));
    });

    /**********************************************************/
    /* Web3 provider */
    /**********************************************************/

    if (process.env.NEXT_PUBLIC_NETWORK === "http://localhost:8545")
      setProvider(ethers.providers.getDefaultProvider(process.env.NEXT_PUBLIC_NETWORK));
    else
      setProvider(
        new ethers.providers.InfuraProvider(process.env.NEXT_PUBLIC_NETWORK, {
          infura: {
            projectId: process.env.NEXT_PUBLIC_INFURA_KEY,
          },
        })
      );

    /**********************************************************/
    /* Contracts */
    /**********************************************************/

    setDisperse(new ethers.Contract(process.env.NEXT_PUBLIC_DISPERSE_ADDRESS, Disperse.abi, provider) as IDisperse);

    return () => {
      unsubscribe(); // Unsubscribe from the wallets subscription on unmount
    };
  }, []);

  useEffect(() => {
    initContext();
  }, [initContext]);

  const value = { provider, disperse };
  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export { Web3Context };
export default Web3;
