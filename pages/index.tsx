import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div className="bg-slate-800 min-h-screen text-white p-10">
      <div className="w-full flex justify-between items-center">
        <h1 className="text-3xl">Disperse Dapp</h1>

        <button className="bg-indigo-800 p-4 rounded-lg text-xl">Connect Wallet</button>
      </div>

      <div className="flex justify-center mt-24 ">Content</div>
    </div>
  );
};

export default Home;
