import { useContext } from "react";
import { Web3Context } from "contexts/Web3";

const useWeb3 = () => {
  const context = useContext(Web3Context);

  if (!context) {
    throw new Error("useWeb3 must be used within Web3 context.");
  }

  return context;
};

export default useWeb3;
