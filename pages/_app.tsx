import "../styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

import Web3Context from "contexts/Web3";

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Context>
        <Component {...pageProps} />{" "}
      </Web3Context>
    </QueryClientProvider>
  );
}

export default MyApp;
