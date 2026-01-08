"use client";

import { ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { getShinamiRpcUrl, isShinamiConfigured } from "@/lib/shinami";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Movement Testnet configuration with Shinami Node Service
  const rpcUrl = getShinamiRpcUrl();

  if (isShinamiConfigured()) {
    console.log("[Wallet] Using Shinami Node Service for Movement Testnet");
  }

  const aptosConfig = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: rpcUrl,
  });

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={aptosConfig}
      onError={(error) => {
        console.error("Wallet error:", JSON.stringify(error, null, 2));
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}