"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerData, MatchResult } from "@/lib/swiss/types";
import { exportToCSV } from "@/lib/swiss/tournament-logic";

interface CSVExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerData[];
  matchResults: MatchResult[];
}

export default function CSVExportDialog({
  isOpen,
  onClose,
  players,
  matchResults,
}: CSVExportDialogProps) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = () => {
    if (!players.length || !matchResults.length) {
      alert("沒有比賽資料可供匯出！");
      return;
    }

    setDownloading(true);

    try {
      const { csvContent, filename } = exportToCSV(players, matchResults);

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClose();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert(`匯出失敗: ${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>匯出CSV</DialogTitle>
          <DialogDescription>
            匯出比賽記錄與最終排名。檔案將下載至您的裝置。
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">匯出資料將包含：</p>
          <ul className="mt-2 list-inside list-disc">
            <li>所有比賽配對與結果</li>
            <li>最終排名</li>
            <li>各玩家戰績與OMW數據</li>
          </ul>
          <p className="mt-2">
            玩家數量: {players.length} | 已完成比賽數: {matchResults.length}
          </p>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button variant="outline" onClick={onClose} disabled={downloading}>
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={downloading || !players.length || !matchResults.length}
          >
            {downloading ? "匯出中..." : "匯出CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
