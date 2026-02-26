import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, XCircle, Clock, TrendingUp, Zap } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ToolCard } from "@/components/tool-card";
import { VerificationTable } from "@/components/verification-table";
import { ActivityChart } from "@/components/activity-chart";
import { ToolDetailPanel } from "@/components/tool-detail-panel";
import { RunVerificationDialog } from "@/components/run-verification-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { Tool, Stats, Verification } from "@shared/schema";

interface DashboardData {
  tools: Tool[];
  stats: Stats[];
  verifications: Verification[];
  chartData: Array<{ date: string; success: number; failed: number }>;
  summary: {
    totalAttempts: number;
    totalSuccess: number;
    totalFailed: number;
    successRate: number;
    activeTools: number;
  };
}

export default function Dashboard() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [runTool, setRunTool] = useState<Tool | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <p className="text-sm text-muted-foreground">Failed to load dashboard data</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  const dashboard = data;
  const filteredTools = categoryFilter === "all"
    ? dashboard.tools
    : dashboard.tools.filter(t => t.category === categoryFilter);

  const getToolStats = (toolId: string) => {
    return dashboard.stats.find(s => s.toolId === toolId);
  };

  return (
    <div className="min-h-full" data-testid="dashboard-page">
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Monitor your verification tools and track performance</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Total Runs"
            value={dashboard.summary.totalAttempts}
            icon={Activity}
            accentColor="hsl(var(--primary))"
          />
          <StatCard
            title="Successful"
            value={dashboard.summary.totalSuccess}
            icon={CheckCircle2}
            accentColor="#10b981"
          />
          <StatCard
            title="Failed"
            value={dashboard.summary.totalFailed}
            icon={XCircle}
            accentColor="#f87171"
          />
          <StatCard
            title="Success Rate"
            value={`${dashboard.summary.successRate}%`}
            icon={TrendingUp}
            accentColor="#8b5cf6"
            subtitle={`${dashboard.summary.activeTools} active tools`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <ActivityChart data={dashboard.chartData} />
          </div>
          <div className="lg:col-span-2">
            <Card className="p-5 h-full" data-testid="top-tools-card">
              <h3 className="text-sm font-semibold mb-1">Top Performing Tools</h3>
              <p className="text-xs text-muted-foreground mb-4">By success rate</p>
              <div className="space-y-3">
                {dashboard.stats
                  .filter(s => s.totalAttempts > 0)
                  .sort((a, b) => {
                    const rateA = a.successCount / a.totalAttempts;
                    const rateB = b.successCount / b.totalAttempts;
                    return rateB - rateA;
                  })
                  .slice(0, 5)
                  .map(s => {
                    const tool = dashboard.tools.find(t => t.id === s.toolId);
                    if (!tool) return null;
                    const rate = Math.round((s.successCount / s.totalAttempts) * 100);
                    return (
                      <div key={s.toolId} className="flex items-center gap-3" data-testid={`top-tool-${s.toolId}`}>
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${tool.color}18`, color: tool.color }}
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium truncate">{tool.name}</p>
                            <span className={`text-xs font-medium ${rate >= 50 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {rate}%
                            </span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-muted mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${rate}%`,
                                backgroundColor: rate >= 50 ? "#10b981" : "#f87171"
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {dashboard.stats.filter(s => s.totalAttempts > 0).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No data available yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold">Verification Tools</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{dashboard.tools.length} tools available</p>
            </div>
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-6 px-2.5" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="student" className="text-xs h-6 px-2.5" data-testid="tab-student">Student</TabsTrigger>
                <TabsTrigger value="teacher" className="text-xs h-6 px-2.5" data-testid="tab-teacher">Teacher</TabsTrigger>
                <TabsTrigger value="military" className="text-xs h-6 px-2.5" data-testid="tab-military">Military</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                stats={getToolStats(tool.id)}
                onClick={() => setSelectedTool(tool)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Recent Verifications</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest verification attempts</p>
          </div>
          <VerificationTable verifications={dashboard.verifications} />
        </div>
      </div>

      {selectedTool && (
        <ToolDetailPanel
          tool={selectedTool}
          stats={getToolStats(selectedTool.id)}
          onClose={() => setSelectedTool(null)}
          onRun={() => {
            setRunTool(selectedTool);
            setSelectedTool(null);
          }}
          onToolUpdate={(updated) => setSelectedTool(updated)}
        />
      )}

      <RunVerificationDialog
        tool={runTool}
        open={!!runTool}
        onOpenChange={(open) => !open && setRunTool(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
        <Card className="lg:col-span-2 p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-md" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 mb-1.5" />
                  <Skeleton className="h-1 w-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
