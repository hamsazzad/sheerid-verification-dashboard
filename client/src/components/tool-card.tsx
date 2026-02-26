import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Play, Bot, Zap, Palette, GraduationCap, Shield, Chrome, ArrowRight, CheckCircle2 } from "lucide-react";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import type { Tool } from "@shared/schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Music, Play, Bot, Zap, Palette, GraduationCap, Shield, Chrome
};

interface ToolCardProps {
  tool: Tool;
  stats?: { totalAttempts: number; successCount: number; failedCount: number };
  onClick: () => void;
}

export function ToolCard({ tool, stats, onClick }: ToolCardProps) {
  const Icon = iconMap[tool.icon] || Shield;
  const categoryClass = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.student;
  const successRate = stats && stats.totalAttempts > 0
    ? Math.round((stats.successCount / stats.totalAttempts) * 100)
    : null;

  return (
    <Card
      className="relative p-5 cursor-pointer group hover-elevate transition-all duration-200"
      onClick={onClick}
      data-testid={`tool-card-${tool.id}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-md shrink-0"
          style={{ backgroundColor: `${tool.color}18`, color: tool.color }}
        >
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{tool.name}</h3>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryClass}`}>
              {tool.type}
            </Badge>
            {tool.isActive && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{tool.description}</p>

          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {stats && (
                <>
                  <span>{stats.totalAttempts} runs</span>
                  {successRate !== null && (
                    <span className={successRate >= 50 ? "text-emerald-500" : "text-red-400"}>
                      {successRate}% success
                    </span>
                  )}
                </>
              )}
              {!stats && <span className="text-muted-foreground/50">No data yet</span>}
            </div>

            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs gap-1" data-testid={`button-view-${tool.id}`}>
              Details <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
