import { createContext, ReactNode, useCallback, useEffect } from "react";
import { init } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";

import SVG from "public/apple.svg";

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

const Web3Context = createContext<{} | null>(null);

const Web3 = ({ children }: { children: ReactNode }) => {
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

    return () => {
      unsubscribe(); // Unsubscribe from the wallets subscription on unmount
    };
  }, []);

  useEffect(() => {
    initContext();
  }, [initContext]);

  const value = {};
  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export { Web3Context };
export default Web3;
