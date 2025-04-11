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
import ResetConfirmationDialog from "@/components/swiss/reset-confirmation-dialog";
import { PlayerData, MatchResult } from "@/lib/swiss/types";
import { pairPlayers, handleByePlayer } from "@/lib/swiss/tournament-logic";
import { ModeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

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
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const confirmPlayers = () => {
    if (!playerInput.trim()) {
      toast.error("請輸入玩家姓名！");
      return;
    }

    const playerNames = playerInput
      .trim()
      .split("\n")
      .filter((name) => name.trim());

    if (playerNames.length < 2) {
      toast.error("至少需要2名玩家！");
      return;
    }

    // Check for duplicates
    const uniqueNames = new Set(playerNames);
    if (uniqueNames.size !== playerNames.length) {
      toast.error("玩家姓名不得重複！");
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
    setCurrentRound(0);
    setResultsConfirmed(false);
    setPairings([]);
    setMatchResults([]);

    try {
      const roundsValue = parseInt(rounds.toString());
      if (isNaN(roundsValue) || roundsValue <= 0) {
        toast.error("請輸入有效的輪次數量（大於0）！");
        return;
      }
      setRounds(roundsValue);
    } catch (e) {
      toast.error("請輸入有效的輪次數量！");
      return;
    }
  };

  const startNextRound = () => {
    if (currentRound >= rounds) {
      toast.success("所有輪次已完成！");
      return;
    }

    if (currentRound > 0 && !resultsConfirmed) {
      toast.error("請先確認當前輪次的比賽結果！");
      return;
    }

    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    setResultsConfirmed(false);

    // Generate pairings for the next round
    const newPairings = pairPlayers(players, nextRound, []);
    setPairings(newPairings);

    // Handle bye if odd number of players
    if (players.length % 2 !== 0) {
      const byePlayer = handleByePlayer(players, nextRound);
      if (byePlayer) {
        // Update player stats for the bye
        const updatedPlayers = [...players];
        const playerIndex = updatedPlayers.findIndex(
          (p) => p.name === byePlayer.name,
        );
        if (playerIndex !== -1) {
          // In Python, bye player gets 1 point and 1 win
          updatedPlayers[playerIndex].points += 1;
          updatedPlayers[playerIndex].wins += 1;
          updatedPlayers[playerIndex].opponents.push("bye");

          // Add to match results
          const byeResult: MatchResult = {
            round: nextRound,
            player1: byePlayer.name,
            player2: "bye",
            winner: "bye",
          };
          setMatchResults((prev) => [...prev, byeResult]);
          setPlayers(updatedPlayers);

          // Notify user with same message as Python
          toast.info(`${byePlayer.name} 輪空 (自動獲勝)`);
        }
      }
    }

    setCustomFirstRoundEnabled(false);
  };

  const handleCustomPairings = (customPairs: [PlayerData, PlayerData][]) => {
    // Apply custom pairings for first round
    if (currentRound === 0 && customPairs.length > 0) {
      setCurrentRound(1);
      setPairings(customPairs);
      setResultsConfirmed(false);
      setCustomFirstRoundEnabled(false);

      // Update opponents lists based on custom pairings
      const updatedPlayers = [...players];
      customPairs.forEach(([p1, p2]) => {
        const player1 = updatedPlayers.find((p) => p.name === p1.name);
        const player2 = updatedPlayers.find((p) => p.name === p2.name);

        if (player1 && player2) {
          if (!player1.opponents.includes(player2.name)) {
            player1.opponents.push(player2.name);
          }
          if (!player2.opponents.includes(player1.name)) {
            player2.opponents.push(player1.name);
          }
        }
      });

      // Handle bye if odd number of players
      if (players.length % 2 !== 0) {
        // Find the player that wasn't paired
        const pairedPlayerNames = new Set<string>();
        customPairs.forEach(([p1, p2]) => {
          pairedPlayerNames.add(p1.name);
          pairedPlayerNames.add(p2.name);
        });

        const byePlayer = updatedPlayers.find(
          (p) => !pairedPlayerNames.has(p.name),
        );
        if (byePlayer) {
          // In Python, bye player gets 1 point and 1 win
          byePlayer.points += 1;
          byePlayer.wins += 1;
          byePlayer.opponents.push("bye");

          // Add to match results
          const byeResult: MatchResult = {
            round: 1,
            player1: byePlayer.name,
            player2: "bye",
            winner: "bye",
          };
          setMatchResults((prev) => [...prev, byeResult]);

          // Notify user with the same message as in Python
          toast.info(`${byePlayer.name} 輪空 (自動獲勝)`);
        }
      }

      setPlayers(updatedPlayers);
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
        if (result.winner === "double_loss") {
          // Handle double loss case as in Python implementation
          player1.losses += 1;
          player2.losses += 1;
          // No points awarded
        } else if (result.winner === player1.name) {
          player1.wins += 1;
          player2.losses += 1;
          player1.points += 1;
        } else if (result.winner === player2.name) {
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

    // Show completion message if this was the final round
    if (currentRound >= rounds) {
      toast.success("所有輪次已完成！");
    }
  };

  const resetTournament = () => {
    setPlayers([]);
    setRounds(4);
    setCurrentRound(0);
    setPlayerInput("");
    setPairings([]);
    setMatchResults([]);
    setResultsConfirmed(false);
    setCustomFirstRoundEnabled(true);
    setTournamentStarted(false);
  };

  return (
    <div className="items-centerS container flex min-h-svh flex-col justify-center overflow-y-auto p-6">
      <div className="flex justify-between">
        <h1 className="mb-4 text-3xl font-bold">瑞士輪模擬器</h1>
        <ModeToggle />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Left Column - Input Area */}
        <Card className={tournamentStarted ? "md:col-span-1" : "md:col-span-3"}>
          {!tournamentStarted && (
            <CardHeader>
              <CardTitle>輸入區</CardTitle>
              <CardDescription>設置玩家和輪次數量</CardDescription>
            </CardHeader>
          )}

          <CardContent>
            {!tournamentStarted ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="player-input">玩家姓名（每行一個）：</Label>
                  <ScrollArea className="">
                    <textarea
                      id="player-input"
                      placeholder="輸入玩家名稱"
                      className="min-h-[150px] w-full rounded border p-2"
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                    />
                  </ScrollArea>
                </div>
                <Separator className="my-4" />
                <div>
                  <Label htmlFor="rounds-input">輪次數量：</Label>
                  <Input
                    id="rounds-input"
                    type="number"
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value))}
                    min={1}
                    className="my-4 w-20"
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
                  onClick={() => setIsResetDialogOpen(true)}
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
                    currentRound={currentRound}
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
                  isFinalStandings={currentRound >= rounds}
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

      <ResetConfirmationDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={() => {
          resetTournament();
          setIsResetDialogOpen(false);
        }}
      />
    </div>
  );
}
