"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getProviders, type Provider } from "@/lib/api";
import { RefreshCw, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function StatusIndicator({ status }: { status: Provider["status"] }) {
  const config = {
    healthy: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    degraded: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    unhealthy: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  };
  const { icon: Icon, color, bg } = config[status];
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-sm capitalize ${color}`}>{status}</span>
    </div>
  );
}

export function ProviderStatus() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProviders = () => {
    setLoading(true);
    setError("");
    getProviders()
      .then(setProviders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Provider Status</CardTitle>
          <CardDescription>Health and availability of compute providers</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProviders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-destructive">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {loading ? "Loading providers..." : "No providers available"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Provider</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Latency</th>
                  <th className="text-left py-3 px-2 font-medium">Availability</th>
                  <th className="text-left py-3 px-2 font-medium">Models</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id} className="border-b last:border-0">
                    <td className="py-3 px-2 font-medium">{provider.name}</td>
                    <td className="py-3 px-2"><StatusIndicator status={provider.status} /></td>
                    <td className="py-3 px-2">{provider.latencyMs}ms</td>
                    <td className="py-3 px-2">{(provider.availability * 100).toFixed(1)}%</td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {provider.modelsSupported.slice(0, 3).map((m) => (
                          <span key={m} className="text-xs bg-muted px-2 py-0.5 rounded">{m}</span>
                        ))}
                        {provider.modelsSupported.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{provider.modelsSupported.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
