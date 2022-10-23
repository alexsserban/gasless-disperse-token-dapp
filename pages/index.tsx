import type { NextPage } from "next";
import { useConnectWallet } from "@web3-onboard/react";

const Home: NextPage = () => {
  const [{ wallet }, connect] = useConnectWallet();

  const account = wallet?.accounts[0].address || "";
  const accountFormatted = account.slice(0, 4) + "..." + account.slice(-4);

  return (
    <div className="bg-slate-800 min-h-screen text-white p-10">
      <div className="w-full flex justify-between items-center">
        <h1 className="text-3xl">Disperse Dapp</h1>

        {wallet ? (
          <div className="btn-main">{accountFormatted}</div>
        ) : (
          <button className="btn-main" onClick={() => connect()}>
            Connect Wallet
          </button>
        )}
      </div>

      <div className="flex justify-center mt-24 ">Content</div>
    </div>
  );
};

export default Home;
