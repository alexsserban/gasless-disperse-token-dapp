import type { NextPage } from "next";
import { useConnectWallet } from "@web3-onboard/react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";

import useWeb3 from "hooks/useWeb3";
import { ZERO_BN, handle, getReadableBN } from "utils";

const Home: NextPage = () => {
  const { provider } = useWeb3();
  const [{ wallet }, connect] = useConnectWallet();

  const account = wallet?.accounts[0].address || "";
  const accountFormatted = account.slice(0, 4) + "..." + account.slice(-4);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors: formErrors },
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      receivers: [{ address: "", amount: 0 }],
    },
  });

  const {
    fields: receivers,
    append: appendReceiver,
    remove: removeReceiver,
  } = useFieldArray({
    name: "receivers",
    control,
  });

  const onFormSubmit = (data: any) => console.log(data);

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
          <button className="btn-wallet" onClick={() => connect()}>
            Connect Wallet
          </button>
        ) : (
          <div className="btn-wallet">{accountFormatted}</div>
        )}
      </div>

      <div className="mt-24 flex flex-col items-center">
        {!wallet ? (
          <div className="text-center">Connect your wallet to view the app</div>
        ) : (
          <div className="max-w-xl">
            <div>
              <h4 className="text-sm font-bold mb-1">Balance</h4>

              {isBalanceError ? (
                <div>Error...</div>
              ) : !provider || !account || isBalanceLoading ? (
                <div className="flex h-14 bg-slate-700 rounded-lg w-full animate-pulse"></div>
              ) : (
                <div className="text-2xl bg-slate-700 p-3 rounded-lg">{getReadableBN(balance)} ETH</div>
              )}
            </div>

            <form className="mt-10" onSubmit={handleSubmit(onFormSubmit)}>
              <h4 className="text-sm font-bold mb-1">Send ETH</h4>

              <div className="bg-slate-700 p-8 rounded-lg w-full">
                {receivers.map((receiver, idx) => (
                  <section key={receiver.id} className="grid grid-cols-12 items-end mb-6">
                    <div className={`grid grid-cols-2 gap-4 w-full ${receivers.length > 1 ? "col-span-10" : "col-span-12"}`}>
                      <div>
                        <label>Address</label>

                        <input
                          type="text"
                          className="input"
                          {...register(`receivers.${idx}.address`, {
                            required: true,
                            pattern: /^0x[a-fA-F0-9]{40}$/g,
                          })}
                        />
                      </div>

                      <div>
                        <label>Amount</label>

                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          {...register(`receivers.${idx}.amount`, {
                            required: true,
                            valueAsNumber: true,
                            min: 0.001,
                          })}
                        />
                      </div>
                    </div>

                    {receivers.length > 1 && (
                      <button className="btn-main ml-4 py-4 flex items-center justify-center h-10 col-span-2" onClick={() => removeReceiver(idx)}>
                        -
                      </button>
                    )}

                    <div className={`mr-2 ${receivers.length > 1 ? "col-span-5" : "col-span-6"}`}>
                      {formErrors.receivers?.[idx]?.address?.type === "required" ? (
                        <p className="form-err">Address Required</p>
                      ) : (
                        formErrors.receivers?.[idx]?.address?.type === "pattern" && <p className="form-err">Invalid Ethereum Address</p>
                      )}
                    </div>

                    <div className={`mr-2 ${receivers.length > 1 ? "col-span-5" : "col-span-6"}`}>
                      {formErrors.receivers?.[idx]?.amount?.type === "required" ? (
                        <p className="form-err">Amount Required</p>
                      ) : (
                        formErrors.receivers?.[idx]?.amount?.type === "min" && <p className="form-err">Minimum Amount is 0.001</p>
                      )}
                    </div>
                  </section>
                ))}

                <div className="w-full flex justify-end gap-4">
                  <button className="btn-main" onClick={() => appendReceiver({ address: "", amount: 0 })}>
                    +
                  </button>
                </div>
              </div>

              <button className="btn-main bg-slate-700 py-4 hover:bg-indigo-800 hover:ring-0 w-full">Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
