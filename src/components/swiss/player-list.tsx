"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerData } from "@/lib/swiss/types";

interface PlayerListProps {
  players: PlayerData[];
}

export default function PlayerList({ players }: PlayerListProps) {
  if (!players.length) {
    return (
      <div className="text-muted-foreground py-4 text-center">沒有玩家資料</div>
    );
  }

  return (
    <ScrollArea className="h-60">
      <div className="space-y-2">
        <h3 className="font-medium">參賽玩家 ({players.length})</h3>
        <ul className="list-inside list-disc space-y-1">
          {players.map((player) => (
            <li key={player.name} className="font-mono">
              {player.name}
            </li>
          ))}
        </ul>
      </div>
    </ScrollArea>
  );
}
