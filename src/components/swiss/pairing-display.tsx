"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerData, MatchResult } from "@/lib/swiss/types";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface PairingDisplayProps {
  pairings: [PlayerData, PlayerData][];
  onConfirmResults: (results: MatchResult[]) => void;
  resultsConfirmed: boolean;
  currentRound: number;
}

export default function PairingDisplay({
  pairings,
  onConfirmResults,
  resultsConfirmed,
  currentRound,
}: PairingDisplayProps) {
  const [results, setResults] = useState<Record<number, string>>({});

  // Reset results when pairings or round changes
  useEffect(() => {
    // Clear results when new pairings are provided or the round changes
    setResults({});
  }, [pairings, currentRound]);

  // Show tournament end notification when there are no more pairings and we're past round 1
  useEffect(() => {
    if (pairings.length === 0 && currentRound > 1) {
      toast.success("比賽已結束！", {
        description: "所有輪次已完成，感謝參與！",
      });
    }
  }, [pairings, currentRound]);

  if (!pairings.length) {
    return (
      <div className="text-muted-foreground py-4 text-center">沒有配對資料</div>
    );
  }

  const handleResultChange = (pairingIndex: number, winner: string) => {
    setResults((prev) => ({
      ...prev,
      [pairingIndex]: winner,
    }));
  };

  const handleConfirmResults = () => {
    // Check if all matches have results
    // Original check only verified count:
    // if (Object.keys(results).length !== pairings.length) {

    // Better check that matches Python implementation - verify no empty results
    const missingResults = pairings.some((_, index) => !results[index]);
    if (missingResults) {
      toast.error("請為每場比賽選擇一個結果！");
      return;
    }

    // Format results for parent component
    const formattedResults: MatchResult[] = pairings.map((pairing, index) => {
      const [player1, player2] = pairing;
      let winner;

      if (results[index] === "double_loss") {
        winner = "double_loss";
      } else {
        winner = results[index];
      }

      return {
        round: currentRound, // Use the current round number
        player1: player1.name,
        player2: player2.name,
        winner,
      };
    });

    onConfirmResults(formattedResults);
  };

  return (
    <div className="space-y-4">
      <h3 className="mb-2 font-bold">第 {currentRound} 輪配對</h3>

      {pairings.map((pairing, index) => {
        const [player1, player2] = pairing;
        const resultValue = results[index] || "";

        return (
          <Card
            key={`${player1.name}-${player2.name}`}
            className="overflow-hidden"
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="text-left font-medium">{player1.name}</div>
              <div className="text-center">
                {resultsConfirmed ? (
                  <div
                    className={`rounded-full px-3 py-1 text-center ${getResultClass(
                      resultValue,
                    )}`}
                  >
                    {getResultText(resultValue, player1.name, player2.name)}
                  </div>
                ) : (
                  <Select
                    value={resultValue}
                    onValueChange={(value) => handleResultChange(index, value)}
                    disabled={resultsConfirmed}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="選擇結果" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={player1.name}>
                        勝者: {player1.name}
                      </SelectItem>
                      <SelectItem value={player2.name}>
                        勝者: {player2.name}
                      </SelectItem>
                      <SelectItem value="double_loss">雙敗</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="text-right font-medium">{player2.name}</div>
            </CardContent>
          </Card>
        );
      })}

      {!resultsConfirmed && (
        <Button onClick={handleConfirmResults} className="mt-4 w-full">
          確認結果
        </Button>
      )}
    </div>
  );
}

function getResultClass(result: string): string {
  if (!result) return "";

  if (result === "double_loss") {
    return "bg-red-100 text-red-800";
  }

  return "bg-green-100 text-green-800";
}

function getResultText(
  result: string,
  player1Name: string,
  player2Name: string,
): string {
  if (!result) return "未定";

  if (result === "double_loss") {
    return "雙敗";
  }

  return `勝者: ${result}`;
}
