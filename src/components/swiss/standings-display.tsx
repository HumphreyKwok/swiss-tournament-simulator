"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerData, OMWRating } from "@/lib/swiss/types";
import {
  calculateOMW,
  getOMWRating,
  calculateStandings,
} from "@/lib/swiss/tournament-logic";

interface StandingsDisplayProps {
  players: PlayerData[];
  currentRound: number;
}

export default function StandingsDisplay({
  players,
  currentRound,
}: StandingsDisplayProps) {
  if (!players.length) {
    return (
      <div className="text-muted-foreground py-4 text-center">沒有玩家資料</div>
    );
  }

  const standings = calculateStandings(players, currentRound);

  // Define rating color mapping
  const ratingColors: Record<OMWRating, string> = {
    偏弱: "text-purple-600",
    正常: "text-green-600",
    偏強: "text-blue-600",
    高手: "text-red-600",
    地獄: "text-black font-bold",
  };

  return (
    <ScrollArea className="h-[300px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">排名</TableHead>
            <TableHead>玩家</TableHead>
            <TableHead className="w-20 text-center">分數</TableHead>
            <TableHead className="w-24 text-center">戰績</TableHead>
            <TableHead className="w-36 text-right">對手綜合強度</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((player) => (
            <TableRow key={player.name}>
              <TableCell className="font-medium">{player.rank}</TableCell>
              <TableCell>{player.name}</TableCell>
              <TableCell className="text-center">{player.points}</TableCell>
              <TableCell className="text-center">
                {player.wins}-{player.losses}
              </TableCell>
              <TableCell className="text-right">
                {currentRound <= 1 ? (
                  <span className="text-gray-500">--</span>
                ) : (
                  <span className={ratingColors[player.omwRating]}>
                    {player.omwRating} ({player.omwValue.toFixed(2)})
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
