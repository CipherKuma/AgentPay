"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getModels, type Model } from "@/lib/api";
import { useX402Payment } from "@/hooks/use-x402-payment";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Loader2 } from "lucide-react";

export function ApiTester() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState(256);
  const [temperature, setTemperature] = useState(0.7);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const { payForInference, payForInferenceStream } = useX402Payment();
  const { connected } = useWallet();

  useEffect(() => {
    getModels()
      .then((m) => {
        setModels(m);
        if (m.length > 0) setSelectedModel(m[0].id);
      })
      .catch(() => setError("Failed to load models"));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setResponse("");

    try {
      if (streamingEnabled) {
        setIsStreaming(true);
        const stream = payForInferenceStream(selectedModel, prompt, { maxTokens, temperature });
        for await (const chunk of stream) {
          setResponse((prev) => prev + chunk);
        }
        setIsStreaming(false);
      } else {
        const result = await payForInference(selectedModel, prompt, { maxTokens, temperature });
        setResponse(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  }, [prompt, streamingEnabled, selectedModel, maxTokens, temperature, payForInference, payForInferenceStream]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Inference API</CardTitle>
          <CardDescription>Send requests to the inference endpoint with x402 payment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Tokens: {maxTokens}</label>
              <Input
                type="range"
                min="64"
                max="2048"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature: {temperature}</label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Enable Streaming</label>
              <p className="text-xs text-muted-foreground">Stream response tokens as they are generated</p>
            </div>
            <Switch checked={streamingEnabled} onCheckedChange={setStreamingEnabled} />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !connected || !prompt.trim()} className="w-full">
            {loading ? (
              <><Loader2 className="animate-spin mr-2" /> {isStreaming ? "Streaming..." : "Processing..."}</>
            ) : (
              "Send Request (Pay with x402)"
            )}
          </Button>

          {!connected && <p className="text-sm text-muted-foreground text-center">Connect wallet to send requests</p>}
        </CardContent>
      </Card>

      {(response || error || isStreaming) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {error ? "Error" : "Response"}
              {isStreaming && <span className="text-xs text-muted-foreground font-normal">(streaming...)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className={`p-4 rounded-md overflow-auto whitespace-pre-wrap ${error ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
              {error || response}
              {isStreaming && <span className="animate-pulse">▊</span>}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
