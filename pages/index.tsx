import type { NextPage } from "next";
import { useConnectWallet } from "@web3-onboard/react";
import { useQuery } from "@tanstack/react-query";

import useWeb3 from "hooks/useWeb3";
import { ZERO_BN, handle, getReadableBN } from "utils";

const Home: NextPage = () => {
  const { provider, setEthersProvider } = useWeb3();
  const [{ wallet }, connect] = useConnectWallet();

  const account = wallet?.accounts[0].address || "";
  const accountFormatted = account.slice(0, 4) + "..." + account.slice(-4);

  const connectWallet = async () => {
    const wallets = await connect();
    setEthersProvider(wallets[0].provider);
  };

  const fetchBalance = async () => {
    if (!provider || !account) return ZERO_BN;

    console.log("Fetching user's ether balance...");

    const balanceRequest = provider.getBalance(account);
    const { data, err } = await handle(balanceRequest);

    if (err || !data) {
      console.error("Error fetching user's ether balance!");
      return ZERO_BN;
    }

    console.log("User ether balance fetched.");
    return data;
  };

  const {
    data: balance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalance,
  } = useQuery(["balance"], fetchBalance, {
    enabled: !!(provider && account),
    initialData: ZERO_BN,
  });

  return (
    <div className="bg-slate-800 min-h-screen text-white p-10">
      <div className="w-full flex justify-between items-center">
        <h1 className="text-3xl">Disperse Dapp</h1>

        {!wallet ? (
          <button className="btn-main" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="btn-main">{accountFormatted}</div>
        )}
      </div>

      <div className="mt-24">
        {!wallet ? (
          <div className="text-center">Connect your wallet to view the app</div>
        ) : (
          <div className="w-full flex flex-col items-center gap-10">
            <div>
              <h4 className="text-sm font-bold mb-1">Balance</h4>

              {isBalanceError ? (
                <div>Error...</div>
              ) : !provider || !account || isBalanceLoading ? (
                <div className="flex h-14 bg-slate-700 rounded-lg w-40 animate-pulse"></div>
              ) : (
                <p className="text-2xl bg-slate-700 p-3 rounded-lg">{getReadableBN(balance)} ETH</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
