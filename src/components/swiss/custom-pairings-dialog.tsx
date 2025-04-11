"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerData } from "@/lib/swiss/types";

interface CustomPairingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerData[];
  onConfirmPairings: (pairings: [PlayerData, PlayerData][]) => void;
}

export default function CustomPairingsDialog({
  isOpen,
  onClose,
  players,
  onConfirmPairings,
}: CustomPairingsDialogProps) {
  const [pairSelections, setPairSelections] = useState<
    Record<number, [string, string]>
  >({});
  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset selections when dialog opens
      setPairSelections({});
      setAvailablePlayers(players.map((p) => p.name));
    }
  }, [isOpen, players]);

  const updatePairSelection = (
    pairIndex: number,
    position: 0 | 1,
    playerName: string,
  ) => {
    setPairSelections((prev) => {
      const currentPair = prev[pairIndex] || ["", ""];

      // If player is already selected elsewhere, remove them from that position
      Object.entries(prev).forEach(([idx, pair]) => {
        const pairIdx = parseInt(idx);
        if (pairIdx !== pairIndex) {
          if (pair[0] === playerName) {
            prev[pairIdx] = ["", pair[1]];
          } else if (pair[1] === playerName) {
            prev[pairIdx] = [pair[0], ""];
          }
        }
      });

      // Update the current pair
      const newPair: [string, string] = [...currentPair] as [string, string];
      newPair[position] = playerName;

      return {
        ...prev,
        [pairIndex]: newPair,
      };
    });
  };

  const getAvailablePlayersForPosition = (
    pairIndex: number,
    position: 0 | 1,
  ) => {
    const currentPair = pairSelections[pairIndex] || ["", ""];
    const otherPosition = position === 0 ? 1 : 0;
    const currentOtherPlayer = currentPair[otherPosition];

    // All player names excluding ones used in other pairs and the other position of current pair
    const usedPlayerNames = new Set<string>();
    Object.values(pairSelections).forEach((pair) => {
      if (pair[0]) usedPlayerNames.add(pair[0]);
      if (pair[1]) usedPlayerNames.add(pair[1]);
    });

    // Don't exclude current position's selection
    if (currentPair[position]) usedPlayerNames.delete(currentPair[position]);

    return players
      .map((p) => p.name)
      .filter(
        (name) => !usedPlayerNames.has(name) && name !== currentOtherPlayer,
      );
  };

  const handleConfirm = () => {
    // Validate that all players are paired (or just one left out for bye)
    const assignedPlayers = new Set<string>();
    Object.values(pairSelections).forEach((pair) => {
      if (pair[0]) assignedPlayers.add(pair[0]);
      if (pair[1]) assignedPlayers.add(pair[1]);
    });

    if (assignedPlayers.size < players.length - 1) {
      alert(
        `未完成配對！目前僅配對了 ${assignedPlayers.size} 名玩家，共 ${players.length} 名玩家。`,
      );
      return;
    }

    // Convert selections to player objects
    const customPairings: [PlayerData, PlayerData][] = [];
    Object.values(pairSelections).forEach((pair) => {
      if (pair[0] && pair[1]) {
        const player1 = players.find((p) => p.name === pair[0]);
        const player2 = players.find((p) => p.name === pair[1]);
        if (player1 && player2) {
          customPairings.push([player1, player2]);
        }
      }
    });

    onConfirmPairings(customPairings);
    onClose();
  };

  const numPairs = Math.floor(players.length / 2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>自訂第一輪配對</DialogTitle>
          <DialogDescription className="text-left">
            手動設定每場比賽的配對。若有奇數位玩家，將有一位自動輪空。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {Array.from({ length: numPairs }).map((_, index) => (
              <div
                key={index}
                className="flex w-full items-center justify-between gap-2"
              >
                <div className="font-medium">配對 {index + 1}:</div>

                <div>
                  <Select
                    value={pairSelections[index]?.[0] || ""}
                    onValueChange={(value) =>
                      updatePairSelection(index, 0, value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選擇玩家" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePlayersForPosition(index, 0).map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-center font-medium">vs</div>

                <div>
                  <Select
                    value={pairSelections[index]?.[1] || ""}
                    onValueChange={(value) =>
                      updatePairSelection(index, 1, value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選擇玩家" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePlayersForPosition(index, 1).map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {players.length % 2 === 1 && (
              <div className="mt-4 rounded-md bg-amber-50 p-3 text-amber-800">
                注意：有奇數位玩家，將有一位自動輪空並獲得本輪勝利。
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm}>確認配對</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
