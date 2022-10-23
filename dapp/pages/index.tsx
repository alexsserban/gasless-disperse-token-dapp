import type { NextPage } from "next";
import { useState } from "react";
import { useConnectWallet } from "@web3-onboard/react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { ethers } from "ethers";

import useWeb3 from "hooks/useWeb3";
import useBiconomy from "hooks/useBiconomy";

import { ZERO_BN, handle, getReadableBN } from "utils";

interface IReceiver {
  address: string;
  amount: number;
}

const Home: NextPage = () => {
  const { provider, disperse, disperseGasless, token } = useWeb3();
  const [{ wallet }, connect] = useConnectWallet();
  const { getBiconomy } = useBiconomy();

  const userAddress = wallet?.accounts[0].address || "";
  const userAddressFormatted = userAddress.slice(0, 4) + "..." + userAddress.slice(-4);

  const [isGasless, setIsGasless] = useState(false);

  // Start with the assumption that the user has enough token balance to disperse
  const [isEnoughTokeBalance, setIsEnoughTokeBalance] = useState(true);

  /**********************************************************/
  /* Form state */
  /**********************************************************/

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

  /**********************************************************/
  /* User's ETH Balance */
  /**********************************************************/

  const fetchBalance = async () => {
    if (!provider || !userAddress) return ZERO_BN;

    console.log("Fetching user's ether balance...");

    let balanceRequest = provider.getBalance(userAddress);
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
    enabled: !!(provider && userAddress),
    initialData: ZERO_BN,
  });

  /**********************************************************/
  /* User's Token Balance, Decimals and Allowances */
  /**********************************************************/

  const initialData = { balance: ZERO_BN, decimals: 18, allowance: { disperse: ZERO_BN, disperseGasless: ZERO_BN } };

  const fetchUserToken = async () => {
    if (!token || !disperse || !disperseGasless || !userAddress) return initialData;

    console.log("Fetching user's token data...");

    const tokenAddress = getValues("tokenAddress");
    const tokenContract = token.attach(tokenAddress);

    let requests = Promise.all([
      tokenContract.balanceOf(userAddress),
      tokenContract.decimals(),
      tokenContract.allowance(userAddress, disperse.address),
      tokenContract.allowance(userAddress, disperseGasless.address),
    ]);

    let { data, err } = await handle(requests);
    if (err || !data || data.length !== 4) {
      console.error("Error fetching user's token data!");
      return initialData;
    }

    console.log("User's token data fetched.");
    return { balance: data[0], decimals: data[1], allowance: { disperse: data[2], disperseGasless: data[3] } };
  };

  const {
    data: userToken,
    isLoading: isUserTokenLoading,
    isError: isUserTokenError,
    refetch: refetchUserToken,
  } = useQuery(["balance", "token"], fetchUserToken, {
    enabled: !!(token && userAddress),
    initialData: initialData,
  });

  /**********************************************************/
  /* Allowance  */
  /**********************************************************/

  const isNotApproved = () => {
    if (!userToken || userToken.balance.toString() === "0") return true;
    return isGasless ? userToken.allowance.disperseGasless.lt(userToken.balance) : userToken.allowance.disperse.lt(userToken.balance);
  };

  const approve = async () => {
    if (!provider || !token || !disperse || !disperseGasless || !wallet) return console.error("Can't connect to the contracts!");

    // Get the signer from web3-onboard wallet
    const ethersProvider = new ethers.providers.Web3Provider(wallet.provider, process.env.NEXT_PUBLIC_NETWORK);
    const signer = ethersProvider.getSigner();

    const tokenAddress = getValues("tokenAddress");
    const tokenAttached = token.attach(tokenAddress);
    let approveReq;

    if (!isGasless) approveReq = tokenAttached.connect(signer).approve(disperse.address, userToken.balance);
    else {
      const domainType = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];

      const Permit = [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ];

      const owner = wallet.accounts[0].address;
      const spender = disperseGasless.address;
      const value = userToken.balance.toString();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from the current time, in seconds

      const requests = Promise.all([tokenAttached.name(), provider.getNetwork(), tokenAttached.nonces(owner)]);
      const { data, err } = await handle(requests);

      if (err || !data || data.length != 3) return console.error("Can't get Token Name, ChainID and User Nonce!");
      const [tokenName, chainId, nonce] = data;

      const domain = {
        name: tokenName,
        version: "1",
        verifyingContract: tokenAddress,
        chainId,
      };

      const permit = {
        owner,
        spender,
        value,
        nonce: nonce.toString(),
        deadline,
      };

      const dataToSign = JSON.stringify({
        types: {
          EIP712Domain: domainType,
          Permit: Permit,
        },
        domain: domain,
        primaryType: "Permit",
        message: permit,
      });

      // Request the user to sign the permit request
      const signatureReq = await ethersProvider.send("eth_signTypedData_v4", [owner, dataToSign]);
      const { data: signature, err: signatureErr } = await handle(signatureReq.json());
      if (signatureErr || !signature) return console.error("Can't get user signature!");

      // Send the permit transaction from the private signer in the backend API
      const apiReq = fetch("/api/approve-gasless", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokenAddress, owner, spender, value, deadline, signature }),
      });

      const { data: apiResponse, err: apiResponseErr } = await handle(apiReq);
      if (apiResponseErr || !apiResponse) return console.error("Can't send approval from the API!");

      const { data: apiData, err: apiDataErr } = await handle(apiResponse.json());
      if (apiDataErr || !apiData || !apiData.txHash) return console.error("Can't parse API response!");

      console.log("Approval sent from the API: ", apiData.txHash);
    }
  };

  /**********************************************************/
  /* Form submit */
  /**********************************************************/

  const onFormSubmit = async (data: { receivers: IReceiver[] }) => {
    if (!disperse || !disperseGasless || !wallet) return console.error("Can't connect to the contracts!");

    // Separate the receiver in addresses / amounts as the Disperse contract expects
    const addresses = data.receivers.map((receiver: IReceiver) => receiver.address);
    const amounts = data.receivers.map((receiver: IReceiver) => ethers.utils.parseUnits(receiver.amount.toString(), userToken.decimals));
    const total = amounts.reduce((a, b) => a.add(b), ZERO_BN);

    // Check if enough balance
    if (total.gte(userToken.balance)) {
      setIsEnoughTokeBalance(false);
      return;
    }

    // Get the signer from web3-onboard wallet
    const ethersProvider = new ethers.providers.Web3Provider(wallet.provider, process.env.NEXT_PUBLIC_NETWORK);
    const signer = ethersProvider.getSigner();

    const tokenAddress = getValues("tokenAddress");
    let disperseReq;

    if (!isGasless) disperseReq = disperse.connect(signer).disperseTokenSimple(tokenAddress, addresses, amounts);
    else {
      const biconomy = await getBiconomy(disperseGasless.address);
      if (!biconomy) return;

      let { data } = await disperseGasless.populateTransaction.disperseTokenSimple(tokenAddress, addresses, amounts);
      let txParams = {
        data,
        to: disperseGasless.address,
        from: wallet.accounts[0].address,
        signatureType: "EIP712_SIGN",
      };

      disperseReq = biconomy.provider.request?.({ method: "eth_sendTransaction", params: [txParams] });
    }

    if (!disperseReq) return;
    const { data: disperseTxn, err: disperseTxnErr } = await handle(disperseReq);

    setIsEnoughTokeBalance(true);

    // Verify if the transaction was successful
    if (disperseTxnErr || !disperseTxn) return console.error("Disperse transaction failed!");
    console.log("Disperse transaction successful! ", disperseTxn.hash);
  };

  return (
    <div className="min-h-screen p-10 text-white bg-slate-800">
      <div className="flex items-center justify-between w-full">
        <h1 className="text-3xl">Disperse Dapp</h1>

        {!wallet ? (
          <button className="btn-wallet" onClick={() => connect()}>
            Connect Wallet
          </button>
        ) : (
          <div className="btn-wallet">{userAddressFormatted}</div>
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
              ) : !provider || !userAddress || isBalanceLoading ? (
                <div className="flex w-full rounded-lg h-14 bg-slate-700 animate-pulse"></div>
              ) : (
                <div className="p-3 text-xl rounded-lg bg-slate-700">{getReadableBN(balance)}</div>
              )}
            </div>

            <div className="flex gap-4 mt-10 justify-left">
              <input type="checkbox" defaultChecked={isGasless} onChange={() => setIsGasless(!isGasless)} />
              <p>Gasless?</p>
            </div>

            <div className="mt-10">
              <div>
                <h4 className="mb-1 text-sm font-bold">Token Address</h4>

                <input
                  type="text"
                  className={`p-4 input bg-slate-700 `}
                  {...register("tokenAddress", {
                    required: true,
                    pattern: /^0x[a-fA-F0-9]{40}$/g,
                    onBlur(event) {
                      refetchUserToken();
                    },
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
                ) : !token || !userAddress || isUserTokenLoading ? (
                  <div className="flex w-full rounded-lg h-14 bg-slate-700 animate-pulse"></div>
                ) : (
                  <div className="p-3 text-xl rounded-lg bg-slate-700">{getReadableBN(userToken.balance, userToken.decimals)}</div>
                )}

                <button className="mt-4 btn-action" onClick={approve}>
                  Approve
                </button>
              </div>
            </div>

            <form className="mt-10" onSubmit={handleSubmit(onFormSubmit)}>
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
                <button className={`btn-action ${isNotApproved() ? "cursor-not-allowed" : ""}`} disabled={isNotApproved()}>
                  Send
                </button>
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
