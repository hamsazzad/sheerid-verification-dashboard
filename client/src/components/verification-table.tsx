import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_COLORS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import type { Verification } from "@shared/schema";

interface VerificationTableProps {
  verifications: Verification[];
}

export function VerificationTable({ verifications }: VerificationTableProps) {
  if (verifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-verifications">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground">No verifications yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Run a verification tool to see results here</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50" data-testid="verification-table">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Tool</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Email</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">University</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">URL</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {verifications.map((v) => {
            const statusClass = STATUS_COLORS[v.status] || STATUS_COLORS.pending;
            return (
              <TableRow key={v.id} className="border-border/30" data-testid={`verification-row-${v.id}`}>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={`text-[10px] ${statusClass}`}>
                          {v.status === "success" ? "successful" : v.status === "failed" ? "failed" : v.status === "pending" ? "pending" : v.status}
                        </Badge>
                      </TooltipTrigger>
                      {v.status === "failed" && (
                        <TooltipContent className="max-w-xs text-xs">
                          Try again with a new verification link
                        </TooltipContent>
                      )}
                      {v.status === "pending" && (
                        <TooltipContent className="max-w-xs text-xs">
                          Waiting for SheerID to review the document
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-xs font-medium">{v.toolId}</TableCell>
                <TableCell className="text-xs">{v.name || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{v.email || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.university || "-"}</TableCell>
                <TableCell>
                  {v.url ? (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline max-w-[120px] truncate"
                      data-testid={`link-verification-url-${v.id}`}
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      {new URL(v.url).hostname}
                    </a>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">-</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
