"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUsageStats, type UsageStats } from "@/lib/api";
import { Activity, DollarSign, TrendingUp, BarChart3 } from "lucide-react";

export function UsageStatsDisplay() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsageStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading usage stats...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Requests",
      value: stats?.totalRequests ?? 0,
      icon: Activity,
      description: "All-time API requests",
    },
    {
      title: "Total Spent",
      value: `${(stats?.totalSpent ?? 0).toFixed(6)} MOVE`,
      icon: DollarSign,
      description: "Total payment amount",
    },
    {
      title: "Average Cost",
      value: `${(stats?.averageCost ?? 0).toFixed(6)} MOVE`,
      icon: TrendingUp,
      description: "Cost per request",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Usage
          </CardTitle>
          <CardDescription>Request and cost trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.dailyUsage && stats.dailyUsage.length > 0 ? (
            <div className="h-64 flex items-end gap-1">
              {stats.dailyUsage.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary rounded-t"
                    style={{ height: `${Math.max(4, (day.requests / Math.max(...stats.dailyUsage.map(d => d.requests))) * 200)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No usage data yet</p>
                <p className="text-sm">Start making API requests to see stats</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
