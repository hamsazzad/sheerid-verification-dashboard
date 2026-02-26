import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Music, Play, Bot, Zap, Palette, GraduationCap, Shield, Chrome, X, CheckCircle2, Code, Package, TrendingUp, Power } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Tool, Stats } from "@shared/schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Music, Play, Bot, Zap, Palette, GraduationCap, Shield, Chrome
};

interface ToolDetailPanelProps {
  tool: Tool;
  stats?: Stats;
  onClose: () => void;
  onRun: () => void;
  onToolUpdate?: (tool: Tool) => void;
}

export function ToolDetailPanel({ tool, stats, onClose, onRun, onToolUpdate }: ToolDetailPanelProps) {
  const Icon = iconMap[tool.icon] || Shield;
  const categoryClass = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.student;
  const successRate = stats && stats.totalAttempts > 0
    ? Math.round((stats.successCount / stats.totalAttempts) * 100)
    : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/tools/${tool.id}/toggle`);
      return res.json();
    },
    onSuccess: (updated: Tool) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (onToolUpdate) onToolUpdate(updated);
      toast({
        title: updated.isActive ? "Tool Enabled" : "Tool Disabled",
        description: `${tool.name} has been ${updated.isActive ? "enabled" : "disabled"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to toggle tool",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="tool-detail-panel">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border-l border-border/50 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/90 backdrop-blur-xl border-b border-border/40">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-md"
              style={{ backgroundColor: `${tool.color}18`, color: tool.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">{tool.name}</h2>
              <p className="text-[10px] text-muted-foreground">{tool.target}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-detail">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${categoryClass}`}>
                {tool.type}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${tool.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {tool.isActive ? (
                  <><CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Active</>
                ) : (
                  <><Power className="w-2.5 h-2.5 mr-1" /> Disabled</>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2" data-testid="tool-toggle">
              <span className="text-[10px] text-muted-foreground">{tool.isActive ? "Enabled" : "Disabled"}</span>
              <Switch
                checked={tool.isActive}
                onCheckedChange={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                data-testid="switch-tool-active"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>

          {stats && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  Statistics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center">
                    <p className="text-lg font-bold" data-testid="text-total-runs">{stats.totalAttempts}</p>
                    <p className="text-[10px] text-muted-foreground">Total Runs</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-lg font-bold text-emerald-500" data-testid="text-success-count">{stats.successCount}</p>
                    <p className="text-[10px] text-muted-foreground">Successful</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-lg font-bold text-red-400" data-testid="text-failed-count">{stats.failedCount}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </Card>
                </div>
                {successRate !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Success Rate</span>
                      <span className={successRate >= 50 ? "text-emerald-500 font-medium" : "text-red-400 font-medium"}>
                        {successRate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${successRate}%`,
                          backgroundColor: successRate >= 50 ? "#10b981" : "#f87171"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              Features
            </h3>
            <ul className="space-y-2">
              {tool.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: tool.color }} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              Requirements
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tool.requirements.map((req, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                  {req}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-muted-foreground" />
              Usage
            </h3>
            <Card className="p-3 bg-muted/30">
              <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto">
{`cd ${tool.id.replace('-verify', '-verify-tool').replace('-teacher', '-teacher-tool')}
python main.py "YOUR_SHEERID_URL"`}
              </pre>
            </Card>
          </div>

          <div className="pt-2">
            <Button
              className="w-full"
              onClick={onRun}
              disabled={!tool.isActive}
              data-testid="button-run-tool"
            >
              <Play className="w-4 h-4 mr-2" />
              {tool.isActive ? "Run Verification" : "Tool Disabled"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
