import "../styles/globals.css";
import type { AppProps } from "next/app";
import Web3Context from "contexts/Web3";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3Context>
      <Component {...pageProps} />{" "}
    </Web3Context>
  );
}

export default MyApp;
