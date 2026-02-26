import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationTable } from "@/components/verification-table";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { Verification } from "@shared/schema";

export default function History() {
  const { data: verifications, isLoading } = useQuery<Verification[]>({
    queryKey: ["/api/verifications"],
  });

  const successCount = verifications?.filter(v => v.status === "success").length || 0;
  const failedCount = verifications?.filter(v => v.status === "failed").length || 0;
  const pendingCount = verifications?.filter(v => v.status === "pending" || v.status === "processing").length || 0;

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-10 w-full" /></Card>
          ))}
        </div>
        <Card className="p-4"><Skeleton className="h-64 w-full" /></Card>
      </div>
    );
  }

  return (
    <div className="min-h-full" data-testid="history-page">
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Verification History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{verifications?.length || 0} total verifications</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{successCount}</p>
              <p className="text-[10px] text-muted-foreground">Successful</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{failedCount}</p>
              <p className="text-[10px] text-muted-foreground">Failed</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
          </Card>
        </div>

        <VerificationTable verifications={verifications || []} />
      </div>
    </div>
  );
}
