import type { NextPage } from "next";
import { useConnectWallet } from "@web3-onboard/react";
import useWeb3 from "hooks/useWeb3";

const Home: NextPage = () => {
  const { setEthersProvider } = useWeb3();
  const [{ wallet }, connect] = useConnectWallet();

  const account = wallet?.accounts[0].address || "";
  const accountFormatted = account.slice(0, 4) + "..." + account.slice(-4);

  const connectWallet = async () => {
    const wallets = await connect();
    setEthersProvider(wallets[0].provider);
  };

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

      <div className="flex justify-center mt-24">
        {!wallet ? <div className="bg-slate-600 p-12 rounded-lg text-lg">Connect your wallet to view the app</div> : <div>App</div>}
      </div>
    </div>
  );
};

export default Home;
