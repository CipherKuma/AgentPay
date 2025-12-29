"use client";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { WalletSelectionModal } from "@/components/wallet-selection-modal";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiTester } from "@/components/api-tester";
import { UsageStatsDisplay } from "@/components/usage-stats";
import { ProviderStatus } from "@/components/provider-status";
import { Zap, BarChart3, Server } from "lucide-react";

export default function Home() {
  const { account, connected } = useWallet();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className={`flex-1 container mx-auto px-4 ${connected ? "py-8" : "flex items-center justify-center"}`}>
        {connected && account?.address ? (
          <Tabs defaultValue="api" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto mb-8">
              <TabsTrigger value="api" className="gap-2">
                <Zap className="h-4 w-4" />
                Test API
              </TabsTrigger>
              <TabsTrigger value="usage" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="providers" className="gap-2">
                <Server className="h-4 w-4" />
                Providers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api">
              <ApiTester />
            </TabsContent>

            <TabsContent value="usage">
              <UsageStatsDisplay />
            </TabsContent>

            <TabsContent value="providers">
              <ProviderStatus />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                AgentPay Dashboard
              </h1>
              <p className="text-xl text-muted-foreground">
                Connect your wallet to test the API and view analytics
              </p>
            </div>

            <WalletSelectionModal>
              <Button size="lg" className="text-lg px-8 py-6">
                Connect Wallet
              </Button>
            </WalletSelectionModal>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>AgentPay - Agent Compute Broker with x402 Payments</p>
        </div>
      </footer>
    </div>
  );
}
