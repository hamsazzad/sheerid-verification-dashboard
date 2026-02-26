import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Music, Play, Bot, Zap, Palette, GraduationCap, Shield, Chrome, CheckCircle2, ExternalLink } from "lucide-react";
import { ToolDetailPanel } from "@/components/tool-detail-panel";
import { RunVerificationDialog } from "@/components/run-verification-dialog";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import type { Tool, Stats } from "@shared/schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Music, Play, Bot, Zap, Palette, GraduationCap, Shield, Chrome
};

export default function Tools() {
  const [search, setSearch] = useState("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [runTool, setRunTool] = useState<Tool | null>(null);

  const { data: tools, isLoading } = useQuery<Tool[]>({ queryKey: ["/api/tools"] });
  const { data: stats } = useQuery<Stats[]>({ queryKey: ["/api/stats"] });

  const filteredTools = tools?.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.type.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getToolStats = (toolId: string) => stats?.find(s => s.toolId === toolId);

  const grouped = filteredTools.reduce<Record<string, Tool[]>>((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="w-12 h-12 rounded-md mb-3" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full" data-testid="tools-page">
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold tracking-tight">All Tools</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{tools?.length || 0} verification tools available</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-testid="input-search-tools"
            />
          </div>
        </div>

        {Object.entries(grouped).map(([category, categoryTools]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryTools.map(tool => {
                const Icon = iconMap[tool.icon] || Shield;
                const categoryClass = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.student;
                const toolStats = getToolStats(tool.id);
                const successRate = toolStats && toolStats.totalAttempts > 0
                  ? Math.round((toolStats.successCount / toolStats.totalAttempts) * 100)
                  : null;

                return (
                  <Card
                    key={tool.id}
                    className="p-5 cursor-pointer group hover-elevate transition-all"
                    onClick={() => setSelectedTool(tool)}
                    data-testid={`tool-card-${tool.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${tool.color}18`, color: tool.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate">{tool.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${categoryClass}`}>
                            {tool.type}
                          </Badge>
                          {tool.isActive && (
                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-500">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{tool.description}</p>

                    <div className="flex items-center justify-between">
                      {successRate !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${successRate}%`,
                                backgroundColor: successRate >= 50 ? "#10b981" : "#f87171"
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{successRate}%</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">No runs yet</span>
                      )}
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {filteredTools.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-tools">
            <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No tools found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
          </div>
        )}
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
