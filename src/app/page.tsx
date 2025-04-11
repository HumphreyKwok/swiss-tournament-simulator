"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerList from "@/components/swiss/player-list";
import PairingDisplay from "@/components/swiss/pairing-display";
import StandingsDisplay from "@/components/swiss/standings-display";
import CustomPairingsDialog from "@/components/swiss/custom-pairings-dialog";
import CSVExportDialog from "@/components/swiss/csv-export-dialog";
import { PlayerData, MatchResult } from "@/lib/swiss/types";
import { pairPlayers } from "@/lib/swiss/tournament-logic";

export default function SwissCalculator() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [rounds, setRounds] = useState(4);
  const [currentRound, setCurrentRound] = useState(0);
  const [playerInput, setPlayerInput] = useState("");
  const [pairings, setPairings] = useState<[PlayerData, PlayerData][]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [resultsConfirmed, setResultsConfirmed] = useState(false);
  const [customFirstRoundEnabled, setCustomFirstRoundEnabled] = useState(true);
  const [tournamentStarted, setTournamentStarted] = useState(false);

  // Dialog states
  const [isCustomPairingOpen, setIsCustomPairingOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const confirmPlayers = () => {
    if (!playerInput.trim()) return;

    const playerNames = playerInput
      .trim()
      .split("\n")
      .filter((name) => name.trim());
    // Check for duplicates
    const uniqueNames = new Set(playerNames);
    if (uniqueNames.size !== playerNames.length) {
      alert("玩家姓名不得重複！");
      return;
    }

    const newPlayers = playerNames.map((name) => ({
      name: name.trim(),
      points: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      opponents: [],
    }));

    setPlayers(newPlayers);
    setTournamentStarted(true);
  };

  const startNextRound = () => {
    if (currentRound >= rounds) {
      alert("所有輪次已完成！");
      return;
    }

    setCurrentRound((prev) => prev + 1);
    setResultsConfirmed(false);
    // Generate pairings for the next round
    const newPairings = pairPlayers(players, currentRound + 1, []);
    setPairings(newPairings);
    setCustomFirstRoundEnabled(false);
  };

  const handleCustomPairings = (customPairs: [PlayerData, PlayerData][]) => {
    // Apply custom pairings for first round
    if (currentRound === 0 && customPairs.length > 0) {
      setCurrentRound(1);
      setPairings(customPairs);
      setResultsConfirmed(false);
      setCustomFirstRoundEnabled(false);
    }
  };

  const confirmResults = (results: MatchResult[]) => {
    // Update round number for each result
    const updatedResults = results.map((result) => ({
      ...result,
      round: currentRound,
    }));

    setMatchResults((prev) => [...prev, ...updatedResults]);

    // Update player stats based on results
    const updatedPlayers = [...players];
    updatedResults.forEach((result) => {
      const player1 = updatedPlayers.find((p) => p.name === result.player1);
      const player2 = updatedPlayers.find((p) => p.name === result.player2);

      if (player1 && player2) {
        if (result.winner === "tie") {
          player1.ties += 1;
          player2.ties += 1;
          player1.points += 0.5;
          player2.points += 0.5;
        } else if (result.winner === player1.name) {
          player1.wins += 1;
          player2.losses += 1;
          player1.points += 1;
        } else {
          player2.wins += 1;
          player1.losses += 1;
          player2.points += 1;
        }

        // Update opponents lists
        if (!player1.opponents.includes(player2.name)) {
          player1.opponents.push(player2.name);
        }
        if (!player2.opponents.includes(player1.name)) {
          player2.opponents.push(player1.name);
        }
      }
    });

    setPlayers(updatedPlayers);
    setResultsConfirmed(true);
  };

  const resetTournament = () => {
    if (confirm("是否要重新開始？所有進度將清空！")) {
      setPlayers([]);
      setRounds(4);
      setCurrentRound(0);
      setPlayerInput("");
      setPairings([]);
      setMatchResults([]);
      setResultsConfirmed(false);
      setCustomFirstRoundEnabled(true);
      setTournamentStarted(false);
    }
  };

  return (
    <div className="container max-h-screen overflow-y-auto p-6">
      <h1 className="mb-4 text-3xl font-bold">瑞士輪模擬器</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Left Column - Input Area */}
        <Card className={tournamentStarted ? "md:col-span-1" : "md:col-span-3"}>
          <CardHeader>
            <CardTitle>輸入區</CardTitle>
            <CardDescription>設置玩家和輪次數量</CardDescription>
          </CardHeader>
          <CardContent>
            {!tournamentStarted ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="player-input">玩家姓名（每行一個）：</Label>
                  <ScrollArea className="h-60">
                    <textarea
                      id="player-input"
                      placeholder="輸入玩家名稱"
                      className="h-full w-full rounded border p-2 font-mono"
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                      style={{ minHeight: "150px" }}
                    />
                  </ScrollArea>
                </div>
                <div className="mt-4">
                  <Label htmlFor="rounds-input">輪次數量：</Label>
                  <Input
                    id="rounds-input"
                    type="number"
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value))}
                    min={1}
                    className="w-20"
                  />
                </div>
              </>
            ) : (
              <PlayerList players={players} />
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            {!tournamentStarted ? (
              <Button onClick={confirmPlayers} className="w-full">
                確認玩家
              </Button>
            ) : (
              <>
                <Button
                  onClick={startNextRound}
                  disabled={
                    currentRound >= rounds ||
                    (!resultsConfirmed && currentRound > 0)
                  }
                  className="w-full"
                >
                  {currentRound === 0 ? "開始第一輪" : "下一輪"}
                </Button>
                {currentRound === 0 && (
                  <Button
                    onClick={() => setIsCustomPairingOpen(true)}
                    disabled={!customFirstRoundEnabled}
                    variant="outline"
                    className="w-full"
                  >
                    自訂第一輪
                  </Button>
                )}
                <Button
                  onClick={resetTournament}
                  variant="destructive"
                  className="w-full"
                >
                  重新開始
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        {/* Right Columns - Results Area */}
        {tournamentStarted && (
          <>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>目前輪次: {currentRound}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentRound > 0 ? (
                  <PairingDisplay
                    pairings={pairings}
                    onConfirmResults={confirmResults}
                    resultsConfirmed={resultsConfirmed}
                  />
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    點擊「開始第一輪」開始配對
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>排名</CardTitle>
              </CardHeader>
              <CardContent>
                <StandingsDisplay
                  players={players}
                  currentRound={currentRound}
                />
              </CardContent>
              <CardFooter>
                {currentRound > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setIsExportDialogOpen(true)}
                  >
                    匯出CSV
                  </Button>
                )}
              </CardFooter>
            </Card>
          </>
        )}
      </div>

      {/* Dialogs */}
      <CustomPairingsDialog
        isOpen={isCustomPairingOpen}
        onClose={() => setIsCustomPairingOpen(false)}
        players={players}
        onConfirmPairings={handleCustomPairings}
      />

      <CSVExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        players={players}
        matchResults={matchResults}
      />
    </div>
  );
}
