"use client";

import { PlayerData, OMWRating, PlayerStanding, MatchResult } from "./types";

/**
 * Calculate Opponent Match Win percentage for a player
 */
export function calculateOMW(
  player: PlayerData,
  allPlayers: PlayerData[],
  currentRound: number,
): number {
  if (!player.opponents.length || currentRound === 0) {
    return 0.0;
  }

  let totalOpponentWinPercent = 0.0;

  for (const oppName of player.opponents) {
    const opponent = allPlayers.find((p) => p.name === oppName);
    if (opponent) {
      const matchesPlayed = opponent.wins + opponent.losses;
      let winPercent = 0.0;

      if (matchesPlayed > 0) {
        winPercent = opponent.wins / matchesPlayed;
      }

      totalOpponentWinPercent += winPercent;
    }
  }

  return totalOpponentWinPercent / player.opponents.length;
}

/**
 * Get a text rating based on OMW value
 */
export function getOMWRating(omw: number): OMWRating {
  if (omw <= 0.4) return "偏弱";
  if (omw <= 0.5) return "正常";
  if (omw <= 0.6) return "偏強";
  if (omw <= 0.7) return "高手";
  return "地獄";
}

/**
 * Pair players for a Swiss tournament round
 */
export function pairPlayers(
  players: PlayerData[],
  roundNum: number,
  customPairs: [PlayerData, PlayerData][],
): [PlayerData, PlayerData][] {
  // If round 1 and custom pairs are provided, use them
  if (roundNum === 1 && customPairs.length > 0) {
    return customPairs;
  }

  // Sort players by points and OMW
  let sortedPlayers = [...players].sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    return (
      calculateOMW(b, players, roundNum - 1) -
      calculateOMW(a, players, roundNum - 1)
    );
  });

  // For first round, apply randomization
  if (roundNum === 1) {
    // Shuffle players for round 1
    for (let i = sortedPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sortedPlayers[i], sortedPlayers[j]] = [
        sortedPlayers[j],
        sortedPlayers[i],
      ];
    }
  }

  const paired: [PlayerData, PlayerData][] = [];
  const used = new Set<string>();

  const availablePlayers = [...sortedPlayers];

  while (availablePlayers.length > 1) {
    const p1 = availablePlayers.shift();
    if (!p1 || used.has(p1.name)) continue;

    let bestOpponent: PlayerData | null = null;
    let minPointDiff = Infinity;
    let bestOMWDiff = Infinity;

    for (const p2 of availablePlayers) {
      if (used.has(p2.name) || p1.opponents.includes(p2.name)) continue;

      const pointDiff = Math.abs(p1.points - p2.points);
      const omwDiff = Math.abs(
        calculateOMW(p1, players, roundNum - 1) -
          calculateOMW(p2, players, roundNum - 1),
      );

      // Similar to Python implementation, first prioritize point difference, then OMW difference
      if (
        pointDiff < minPointDiff ||
        (pointDiff === minPointDiff && omwDiff < bestOMWDiff)
      ) {
        minPointDiff = pointDiff;
        bestOMWDiff = omwDiff;
        bestOpponent = p2;
      }
    }

    if (bestOpponent) {
      paired.push([p1, bestOpponent]);
      used.add(p1.name);
      used.add(bestOpponent.name);

      // Remove the opponent from available players
      const index = availablePlayers.findIndex(
        (p) => p.name === bestOpponent!.name,
      );
      if (index !== -1) {
        availablePlayers.splice(index, 1);
      }
    }
  }

  return paired;
}

/**
 * Handle bye player (for odd number of players)
 */
export function handleByePlayer(
  players: PlayerData[],
  currentRound: number,
): PlayerData | null {
  // Based on the Python implementation, after pairing, if there's a player left, they get a bye
  // Sort players by points and OMW to get the lowest ranked player for the bye
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.points !== b.points) {
      return a.points - b.points; // Lower points get bye first
    }
    return (
      calculateOMW(a, players, currentRound - 1) -
      calculateOMW(b, players, currentRound - 1)
    );
  });

  // Find a player who hasn't had a bye yet (no opponent named "bye")
  for (const player of sortedPlayers) {
    if (!player.opponents.includes("bye")) {
      return player;
    }
  }

  // If all have had byes, return the lowest ranked player
  return sortedPlayers.length > 0 ? sortedPlayers[0] : null;
}

/**
 * Calculate current standings
 */
export function calculateStandings(
  players: PlayerData[],
  currentRound: number,
): PlayerStanding[] {
  return [...players]
    .sort((a, b) => {
      // First sort by points
      if (a.points !== b.points) {
        return b.points - a.points;
      }

      // Then by OMW
      const aOMW = calculateOMW(a, players, currentRound);
      const bOMW = calculateOMW(b, players, currentRound);
      return bOMW - aOMW;
    })
    .map((player, index) => {
      const omwValue = calculateOMW(player, players, currentRound);
      return {
        ...player,
        rank: index + 1,
        omwValue,
        omwRating: getOMWRating(omwValue),
      };
    });
}

/**
 * Export tournament data to CSV format
 */
export function exportToCSV(
  players: PlayerData[],
  matchResults: MatchResult[],
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
  const filename = `swiss_tournament_${timestamp}.csv`;

  let csvContent = "Round,Player1,Player2,Result\n";

  matchResults.forEach((match) => {
    csvContent += `${match.round},${match.player1},${match.player2},${match.winner}\n`;
  });

  csvContent += "\nFinal Standings\n";
  csvContent += "Rank,Player,Points,Wins,Losses,Ties,OMW\n";

  const standings = calculateStandings(
    players,
    Math.max(...matchResults.map((m) => m.round), 0),
  );

  standings.forEach((player) => {
    csvContent += `${player.rank},${player.name},${player.points},${player.wins},${player.losses},${player.ties},${player.omwValue.toFixed(2)}\n`;
  });

  return { csvContent, filename };
}
