import { createContext, ReactNode, useCallback, useEffect, useState } from "react";
import { init } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";
import { ethers } from "ethers";

import Disperse from "contracts/artifacts/contracts/Disperse.sol/Disperse.json";
import type { Disperse as IDisperse } from "contracts/typechain-types/Disperse";

import DisperseGasless from "contracts/artifacts/contracts/DisperseGaslessV2.sol/DisperseGaslessV2.json";
import type { DisperseGaslessV2 as IDisperseGasless } from "contracts/typechain-types/contracts/DisperseGaslessV2.sol/DisperseGaslessV2";

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
    icon: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" /></svg>',
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
  disperseGasless: IDisperseGasless | undefined;
} | null>(null);

const Web3 = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<ethers.providers.InfuraProvider | ethers.providers.BaseProvider>();
  const [disperse, setDisperse] = useState<IDisperse>();
  const [disperseGasless, setDisperseGasless] = useState<IDisperseGasless>();

  const initContext = useCallback(async () => {
    /**********************************************************/
    /* Auto-connect to Wallet */
    /**********************************************************/

    const localStorageWallets = window.localStorage.getItem("connectedWallets") || "";
    if (localStorageWallets) {
      const previouslyConnectedWallets = JSON.parse(localStorageWallets);

      if (previouslyConnectedWallets.length) {
        await onboard.connectWallet({
          autoSelect: { label: previouslyConnectedWallets[0], disableModals: true },
        });
      }
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

    let provider;

    if (process.env.NEXT_PUBLIC_NETWORK === "http://localhost:8545") provider = ethers.providers.getDefaultProvider(process.env.NEXT_PUBLIC_NETWORK);
    else
      provider = new ethers.providers.InfuraProvider(process.env.NEXT_PUBLIC_NETWORK, {
        infura: {
          projectId: process.env.NEXT_PUBLIC_INFURA_KEY,
        },
      });

    setProvider(provider);

    /**********************************************************/
    /* Contracts */
    /**********************************************************/

    setDisperse(new ethers.Contract(process.env.NEXT_PUBLIC_DISPERSE_ADDRESS, Disperse.abi, provider) as IDisperse);
    setDisperseGasless(new ethers.Contract(process.env.NEXT_PUBLIC_DISPERSE_GASLESS_ADDRESS, DisperseGasless.abi, provider) as IDisperseGasless);

    return () => {
      unsubscribe(); // Unsubscribe from the wallets subscription on unmount
    };
  }, []);

  useEffect(() => {
    initContext();
  }, [initContext]);

  const value = { provider, disperse, disperseGasless };
  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export { Web3Context };
export default Web3;
