"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
}

export function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[3rem_2.5rem_1fr_5rem] gap-2 px-3 py-2 text-xs text-muted-foreground font-medium">
        <span>Rank</span>
        <span />
        <span>Player</span>
        <span className="text-right">Score</span>
      </div>
      {entries.map((entry) => {
        const isMe = entry.userId === currentUserId;
        return (
          <div
            key={entry.userId}
            className={cn(
              "grid grid-cols-[3rem_2.5rem_1fr_5rem] gap-2 items-center px-3 py-2.5 rounded-lg transition-colors",
              isMe
                ? "bg-amber-500/10 border border-amber-500/20"
                : "hover:bg-slate-800/50"
            )}
          >
            <span
              className={cn(
                "font-mono font-bold text-sm",
                entry.rank === 1 && "text-amber-400",
                entry.rank === 2 && "text-slate-300",
                entry.rank === 3 && "text-amber-600",
                entry.rank > 3 && "text-muted-foreground"
              )}
            >
              {entry.rank <= 3
                ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                : `#${entry.rank}`}
            </span>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-slate-800 text-amber-400 text-xs">
                {entry.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "text-sm truncate",
                isMe ? "text-amber-400 font-semibold" : "text-slate-200"
              )}
            >
              {entry.displayName}
              {isMe && " (you)"}
            </span>
            <span className="text-right font-mono text-sm text-amber-400 font-semibold">
              {entry.score.toLocaleString()}
            </span>
          </div>
        );
      })}
      {entries.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">
          No entries yet. Be the first!
        </p>
      )}
    </div>
  );
}
