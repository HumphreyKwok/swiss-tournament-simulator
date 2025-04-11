"use client";

import { useState } from "react";
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

interface PairingDisplayProps {
  pairings: [PlayerData, PlayerData][];
  onConfirmResults: (results: MatchResult[]) => void;
  resultsConfirmed: boolean;
}

export default function PairingDisplay({
  pairings,
  onConfirmResults,
  resultsConfirmed,
}: PairingDisplayProps) {
  const [results, setResults] = useState<Record<number, string>>({});

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
    if (Object.keys(results).length !== pairings.length) {
      alert("請為每場比賽選擇一個結果！");
      return;
    }

    // Format results for parent component
    const formattedResults: MatchResult[] = pairings.map((pairing, index) => {
      const [player1, player2] = pairing;
      const winner = results[index] === "tie" ? "tie" : results[index];

      return {
        round: 1, // This will be updated by the parent component
        player1: player1.name,
        player2: player2.name,
        winner,
      };
    });

    onConfirmResults(formattedResults);
  };

  return (
    <div className="space-y-4">
      {pairings.map((pairing, index) => {
        const [player1, player2] = pairing;
        const resultValue = results[index] || "";

        return (
          <Card
            key={`${player1.name}-${player2.name}`}
            className="overflow-hidden"
          >
            <CardContent className="grid grid-cols-3 items-center p-4">
              <div className="text-left font-medium">{player1.name}</div>
              <div className="text-center">
                {resultsConfirmed ? (
                  <div
                    className={`rounded-full px-3 py-1 text-center ${getResultClass(
                      resultValue,
                      player1.name,
                    )}`}
                  >
                    {getResultText(resultValue, player1.name)}
                  </div>
                ) : (
                  <Select
                    value={resultValue}
                    onValueChange={(value) => handleResultChange(index, value)}
                    disabled={resultsConfirmed}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選擇結果" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={player1.name}>
                        勝者: {player1.name}
                      </SelectItem>
                      <SelectItem value={player2.name}>
                        勝者: {player2.name}
                      </SelectItem>
                      <SelectItem value="tie">雙敗</SelectItem>
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

function getResultClass(result: string, playerName: string): string {
  if (!result) return "";

  if (result === "tie") {
    return "bg-orange-100 text-orange-800";
  }

  return result === playerName
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

function getResultText(result: string, playerName: string): string {
  if (!result) return "未定";

  if (result === "tie") {
    return "雙敗";
  }

  return result === playerName ? "勝" : "敗";
}
