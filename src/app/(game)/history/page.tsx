"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HistoryEntry {
  date: string;
  score: number;
  correctCount: number;
  totalCount: number;
  streakAtTime: number;
}

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchHistory(0);
  }, []);

  async function fetchHistory(pageNum: number) {
    setIsLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("daily_results")
      .select("*")
      .eq("user_id", user.id)
      .order("deck_date", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (data) {
      const mapped: HistoryEntry[] = data.map((r: any) => ({
        date: r.deck_date,
        score: r.total_score ?? 0,
        correctCount: r.correct_count ?? 0,
        totalCount: r.total_count ?? 5,
        streakAtTime: r.streak_at_time ?? 0,
      }));

      if (pageNum === 0) {
        setEntries(mapped);
      } else {
        setEntries((prev) => [...prev, ...mapped]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }

    setPage(pageNum);
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">
          Prediction History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your journey through the Oracle&apos;s trials
        </p>
      </div>

      {entries.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-12">
          No history yet. Start playing to build your record.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card
            key={entry.date}
            className="bg-slate-900/80 border-slate-800/50"
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    {entry.date}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-slate-800 text-slate-400 text-xs"
                    >
                      {entry.correctCount}/{entry.totalCount} correct
                    </Badge>
                    {entry.streakAtTime > 0 && (
                      <span className="text-xs text-muted-foreground">
                        🔥 {entry.streakAtTime}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono font-bold text-lg text-amber-400">
                  {entry.score}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && entries.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchHistory(page + 1)}
            disabled={isLoading}
            className="border-slate-700 text-slate-300"
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
