import type { NextPage } from "next";
import { useState } from "react";
import { useConnectWallet } from "@web3-onboard/react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { ethers } from "ethers";

import useWeb3 from "hooks/useWeb3";
import { ZERO_BN, handle, getReadableBN } from "utils";

interface IReceiver {
  address: string;
  amount: number;
}

const Home: NextPage = () => {
  const { provider, disperse, token } = useWeb3();
  const [{ wallet }, connect] = useConnectWallet();

  const account = wallet?.accounts[0].address || "";
  const accountFormatted = account.slice(0, 4) + "..." + account.slice(-4);

  // Start with the assumption that the user has enough token balance to disperse
  const [isEnoughTokeBalance, setIsEnoughTokeBalance] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors: formErrors },
    getValues,
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      receivers: [{ address: "", amount: 0 }],
      tokenAddress: "",
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

  const onFormSubmit = async (data: { receivers: IReceiver[] }) => {
    if (!disperse) return console.error("Can't connect to the disperse contract!");
    if (!wallet) return console.error("Wallet not available!");

    // Separate the receiver in addresses / amounts as the Disperse contract expects
    const addresses = data.receivers.map((receiver: IReceiver) => receiver.address);
    const amounts = data.receivers.map((receiver: IReceiver) => ethers.utils.parseEther(receiver.amount.toString()));
    const total = amounts.reduce((a, b) => a.add(b), ZERO_BN);

    // Check if enough balance
    if (total.gte(balance)) {
      setIsEnoughTokeBalance(false);
      return;
    }

    // Get the signer from web3-onboard wallet
    const ethersProvider = new ethers.providers.Web3Provider(wallet.provider, process.env.NEXT_PUBLIC_NETWORK);
    const signer = ethersProvider.getSigner();

    // Send the Disperse transaction
    const disperseReq = disperse.connect(signer).disperseEther(addresses, amounts, { value: total });
    const { data: disperseTxn, err: disperseTxnErr } = await handle(disperseReq);

    setIsEnoughTokeBalance(true);

    // Verify if the transaction was successful
    if (disperseTxnErr || !disperseTxn) return console.error("Disperse transaction failed!");
    console.log("Disperse transaction successful! ", disperseTxn.hash);
  };

  /**********************************************************/
  /* User's ETH and Token Balance */
  /**********************************************************/

  const fetchBalance = async () => {
    if (!provider || !account) return ZERO_BN;

    console.log("Fetching user's ether balance...");

    let balanceRequest = provider.getBalance(account);
    let { data, err } = await handle(balanceRequest);

    if (err || !data) {
      console.error("Error fetching user's ether balance!");
      return ZERO_BN;
    }

    console.log("User's ether balance fetched.");
    return data;
  };

  const {
    data: balance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalance,
  } = useQuery(["balance", "eth"], fetchBalance, {
    enabled: !!(provider && account),
    initialData: ZERO_BN,
  });

  /**********************************************************/
  /* User's Token Balance */
  /**********************************************************/

  const initialData = { balance: ZERO_BN, decimals: 18 };

  const fetchUserToken = async () => {
    if (!token || !account) return initialData;

    console.log("Fetching user's token balance...");

    const tokenAddress = getValues("tokenAddress");
    const tokenContract = token.attach(tokenAddress);

    const balanceRequest = tokenContract.balanceOf(account);
    let { data: balance, err: balanceErr } = await handle(balanceRequest);

    if (balanceErr || !balance) {
      console.error("Error fetching user's token balance!");
      return initialData;
    }

    console.log("Fetching token's decimals...");

    const decimalsRequest = tokenContract.decimals();
    let { data: decimals, err: decimalsErr } = await handle(decimalsRequest);

    if (decimalsErr || !decimals) {
      console.error("Error fetching token's decimals!");
      return initialData;
    }

    console.log("User's token balance fetched.");
    return { balance, decimals };
  };

  const {
    data: userToken,
    isLoading: isUserTokenLoading,
    isError: isUserTokenError,
    refetch: UserTokenBalance,
  } = useQuery(["balance", "token"], fetchUserToken, {
    enabled: !!(token && account),
    initialData: initialData,
  });

  return (
    <div className="min-h-screen p-10 text-white bg-slate-800">
      <div className="flex items-center justify-between w-full">
        <h1 className="text-3xl">Disperse Dapp</h1>

        {!wallet ? (
          <button className="btn-wallet" onClick={() => connect()}>
            Connect Wallet
          </button>
        ) : (
          <div className="btn-wallet">{accountFormatted}</div>
        )}
      </div>

      <div className="flex flex-col items-center mt-24">
        {!wallet ? (
          <div className="text-center">Connect your wallet to view the app</div>
        ) : (
          <div className="max-w-xl">
            <div>
              <h4 className="mb-1 text-sm font-bold">ETH Balance</h4>

              {isBalanceError ? (
                <div>Error...</div>
              ) : !provider || !account || isBalanceLoading ? (
                <div className="flex w-full rounded-lg h-14 bg-slate-700 animate-pulse"></div>
              ) : (
                <div className="p-3 text-xl rounded-lg bg-slate-700">{getReadableBN(balance)}</div>
              )}
            </div>

            <div className="mt-16">
              <div>
                <h4 className="mb-1 text-sm font-bold">Token Address</h4>

                <input
                  type="text"
                  className={`p-4 input bg-slate-700 `}
                  {...register("tokenAddress", {
                    required: true,
                    pattern: /^0x[a-fA-F0-9]{40}$/g,
                  })}
                />

                {formErrors.tokenAddress?.type === "required" ? (
                  <p className="form-err">Address Required</p>
                ) : (
                  formErrors.tokenAddress?.type === "pattern" && <p className="form-err">Invalid Ethereum Address</p>
                )}
              </div>

              <div>
                <h4 className={`mb-1 text-sm font-bold ${formErrors.tokenAddress ? "mt-2" : "mt-4"}`}>Token Balance</h4>

                {isUserTokenError && userToken.toString() != "0" && !formErrors.tokenAddress ? (
                  <div>Error...</div>
                ) : !token || !account || isUserTokenLoading ? (
                  <div className="flex w-full rounded-lg h-14 bg-slate-700 animate-pulse"></div>
                ) : (
                  <div className="p-3 text-xl rounded-lg bg-slate-700">{getReadableBN(userToken.balance, userToken.decimals)}</div>
                )}
              </div>
            </div>

            <form className="mt-16" onSubmit={handleSubmit(onFormSubmit)}>
              <h4 className="mb-1 text-sm font-bold">Send ETH</h4>
              <div className="w-full p-8 rounded-lg bg-slate-700">
                {receivers.map((receiver, idx) => (
                  <section key={receiver.id} className="grid items-end grid-cols-12 mb-6">
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
                          className="input"
                          step="0.0001"
                          {...register(`receivers.${idx}.amount`, {
                            required: true,
                            valueAsNumber: true,
                            min: 0.0001,
                            onChange(event) {
                              setIsEnoughTokeBalance(true);
                            },
                          })}
                        />
                      </div>
                    </div>

                    {receivers.length > 1 && (
                      <button className="flex items-center justify-center h-10 col-span-2 py-4 ml-4 btn-main" onClick={() => removeReceiver(idx)}>
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
                        formErrors.receivers?.[idx]?.amount?.type === "min" && <p className="form-err">Minimum Amount is 0.0001</p>
                      )}
                    </div>
                  </section>
                ))}

                <div className="flex justify-end w-full gap-4">
                  <button className="btn-main" onClick={() => appendReceiver({ address: "", amount: 0 })}>
                    +
                  </button>
                </div>
              </div>
              <div>
                <button className="w-full py-4 btn-main bg-slate-700 hover:bg-indigo-800 hover:ring-0">Send</button>
                {!isEnoughTokeBalance && <p className="form-err">Not enough balance</p>}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
