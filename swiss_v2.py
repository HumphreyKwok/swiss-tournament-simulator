import math
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import csv
import os
from datetime import datetime

class Player:
    def __init__(self, name):
        self.name = name
        self.points = 0
        self.wins = 0
        self.losses = 0
        self.ties = 0
        self.opponents = []

    def __str__(self):
        return f"{self.name} ({self.points}分, {self.wins}-{self.losses})"

    def get_omw(self, all_players, current_round):
        if not self.opponents or current_round == 0:
            return 0.0
        total_opponent_win_percent = 0.0
        for opp in self.opponents:
            matches_played = opp.wins + opp.losses
            if matches_played == 0:
                win_percent = 0.0
            else:
                win_percent = opp.wins / matches_played
            total_opponent_win_percent += win_percent
        return total_opponent_win_percent / len(self.opponents)

class SwissSimulatorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("瑞士輪模擬器")
        self.root.geometry("1020x700")  # Adjusted default window size
        self.root.resizable(True, True)
        self.root.iconbitmap('')

        # Define default fonts
        self.default_font = ("Arial", 16)
        self.default_bold_font = ("Arial", 16, "bold")
        self.mono_font = ("Courier New", 16)

        # Define rating colors
        self.rating_colors = {
            "偏弱": "purple",
            "正常": "green",
            "偏強": "blue",
            "高手": "red",
            "地獄": "black"
        }

        self.players = []
        self.rounds = 0
        self.current_round = 0
        self.custom_pairs = []
        self.paired_matches = []
        self.match_history = []
        self.results_confirmed = False
        self.confirm_players_enabled = True

        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Red.TButton", foreground="white", background="red", font=self.default_bold_font)
        style.map("Red.TButton", background=[("active", "darkred")], foreground=[("active", "white")])
        style.configure("Gold.TButton", foreground="black", background="gold", font=self.default_bold_font)
        style.map("Gold.TButton", background=[("active", "goldenrod")], foreground=[("active", "black")])
        style.configure("Large.TButton", font=self.default_bold_font)
        style.configure("Treeview", font=self.default_font)
        style.configure("Treeview.Heading", font=self.default_bold_font)

        self.main_frame = ttk.Frame(root, padding="10")
        self.main_frame.pack(fill="both", expand=True)

        self.left_frame = ttk.LabelFrame(self.main_frame, text="輸入區", padding="5")
        self.left_frame.pack(side="left", fill="y", padx=5)

        ttk.Label(self.left_frame, text="玩家姓名（每行一個）：", font=self.default_font).pack(anchor="w")
        self.player_input = scrolledtext.ScrolledText(self.left_frame, width=25, height=10, font=self.default_font)
        self.player_input.pack(pady=5)

        rounds_frame = ttk.Frame(self.left_frame)
        rounds_frame.pack(anchor="w", pady=5)
        ttk.Label(rounds_frame, text="輪次數量：", font=self.default_font).pack(side="left")
        self.rounds_entry = ttk.Entry(rounds_frame, width=10, font=self.default_font)
        self.rounds_entry.pack(side="left")
        self.rounds_entry.insert(0, "4")

        self.confirm_players_button = ttk.Button(self.left_frame, text="確認玩家", command=self.confirm_players, style="Large.TButton")
        self.confirm_players_button.pack(pady=5)
        self.custom_first_round_button = ttk.Button(self.left_frame, text="自訂第一輪", command=self.custom_first_round, state="disabled", style="Large.TButton")
        self.custom_first_round_button.pack(pady=5)
        self.next_round_button = ttk.Button(self.left_frame, text="下一輪", command=self.next_round, state="disabled", style="Large.TButton")
        self.next_round_button.pack(pady=5)
        ttk.Button(self.left_frame, text="排名查詢", command=self.show_rankings, style="Gold.TButton").pack(pady=5)

        bottom_frame = ttk.Frame(self.left_frame)
        bottom_frame.pack(side="bottom", fill="x", pady=5)
        ttk.Button(bottom_frame, text="匯出CSV", command=self.export_to_csv, style="Large.TButton").pack(side="left", padx=2)
        ttk.Button(bottom_frame, text="重新開始", command=self.reset_confirm, style="Red.TButton").pack(side="left", padx=2)

        self.right_frame = ttk.LabelFrame(self.main_frame, text="結果區", padding="5")
        self.right_frame.pack(side="right", fill="both", expand=True, padx=5)

        # Add current round label on top of the result area
        self.current_round_label = ttk.Label(self.right_frame, text="目前輪次: 0", font=self.default_bold_font)
        self.current_round_label.pack(anchor="n", pady=5)

        self.tree = ttk.Treeview(self.right_frame, columns=("Match", "Result"), show="headings", height=15)
        self.tree.heading("Match", text="配對")
        self.tree.heading("Result", text="結果")
        self.tree.column("Match", width=250, anchor="center")
        self.tree.column("Result", width=250, anchor="center")
        self.tree.pack(fill="both", expand=True, pady=5)

        self.score_text = scrolledtext.ScrolledText(self.right_frame, width=60, height=40, font=self.mono_font)
        self.score_text.pack(fill="x", pady=5)

    def get_omw_rating(self, omw):
        if omw <= 0.4:
            return "偏弱"
        elif omw <= 0.5:
            return "正常"
        elif omw <= 0.6:
            return "偏強"
        elif omw <= 0.7:
            return "高手"
        else:
            return "地獄"

    def confirm_players(self):
        if not self.confirm_players_enabled:
            return

        self.players = []
        names = self.player_input.get("1.0", tk.END).strip().split("\n")
        names = [name.strip() for name in names if name.strip()]
        
        if len(names) != len(set(names)):
            messagebox.showerror("錯誤", "玩家姓名不得重複！")
            return
        
        for name in names:
            self.players.append(Player(name))
        
        if len(self.players) < 2:
            messagebox.showerror("錯誤", "至少需要2名玩家！")
            return
        
        try:
            self.rounds = int(self.rounds_entry.get())
            if self.rounds <= 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("錯誤", "請輸入有效的輪次數量（大於0）！")
            return

        self.current_round = 0
        self.results_confirmed = False
        self.next_round_button.config(state="normal")
        if self.current_round == 0:
            self.custom_first_round_button.config(state="normal")
        self.tree.delete(*self.tree.get_children())
        self.score_text.delete("1.0", tk.END)
        self.score_text.insert(tk.END, f"參賽人數: {len(self.players)}\n")
        self.score_text.insert(tk.END, f"總輪次: {self.rounds}\n")
        self.current_round_label.config(text=f"目前輪次: {self.current_round}")  # Update round label

    def custom_first_round(self):
        if not self.players:
            messagebox.showerror("錯誤", "請先輸入玩家姓名並確認！")
            return

        self.confirm_players_enabled = False
        self.confirm_players_button.config(state="disabled")

        custom_window = tk.Toplevel(self.root)
        custom_window.title("自訂第一輪配對")
        custom_window.geometry("500x400")
        custom_window.resizable(True, True)
        custom_window.iconbitmap('')

        ttk.Label(custom_window, text="選擇每場比賽的配對：", font=self.default_font).pack(pady=5)

        available_players = [p.name for p in self.players]
        pair_vars = []
        comboboxes = []

        def update_options(*args):
            used_players = set()
            for p1_var, p2_var in pair_vars:
                p1 = p1_var.get()
                p2 = p2_var.get()
                if p1: used_players.add(p1)
                if p2: used_players.add(p2)
            
            remaining = [name for name in available_players if name not in used_players]
            for p1_combo, p2_combo in comboboxes:
                current_p1 = p1_combo.get()
                current_p2 = p2_combo.get()
                p1_combo['values'] = [current_p1] + [n for n in remaining if n != current_p1 and n != current_p2] if current_p1 else remaining
                p2_combo['values'] = [current_p2] + [n for n in remaining if n != current_p1 and n != current_p2] if current_p2 else remaining

        for i in range(len(self.players) // 2):
            frame = ttk.Frame(custom_window)
            frame.pack(fill="x", pady=5)
            ttk.Label(frame, text=f"配對 {i+1}:", font=self.default_font).pack(side="left", padx=5)
            p1_var = tk.StringVar(value="")
            p2_var = tk.StringVar(value="")
            p1_combo = ttk.Combobox(frame, textvariable=p1_var, values=available_players, state="readonly", font=self.default_font)
            p2_combo = ttk.Combobox(frame, textvariable=p2_var, values=available_players, state="readonly", font=self.default_font)
            p1_combo.pack(side="left", padx=5)
            p2_combo.pack(side="left", padx=5)
            pair_vars.append((p1_var, p2_var))
            comboboxes.append((p1_combo, p2_combo))
            p1_var.trace("w", update_options)
            p2_var.trace("w", update_options)

        def save_pairs():
            self.custom_pairs = []
            used_players = set()
            for p1_var, p2_var in pair_vars:
                p1_name = p1_var.get()
                p2_name = p2_var.get()
                if p1_name and p2_name:
                    if p1_name == p2_name or p1_name in used_players or p2_name in used_players:
                        messagebox.showerror("錯誤", "玩家不能重複使用！")
                        return
                    p1 = next(p for p in self.players if p.name == p1_name)
                    p2 = next(p for p in self.players if p.name == p2_name)
                    self.custom_pairs.append((p1, p2))
                    p1.opponents.append(p2)
                    p2.opponents.append(p1)
                    used_players.add(p1_name)
                    used_players.add(p2_name)

            if len(used_players) != len(self.players) and len(used_players) + 1 != len(self.players):
                messagebox.showerror("錯誤", "自訂配對未涵蓋所有玩家，請檢查！")
                return

            remaining = [p for p in self.players if p.name not in used_players]
            for i in range(0, len(remaining) - 1, 2):
                p1, p2 = remaining[i], remaining[i + 1]
                self.custom_pairs.append((p1, p2))
                p1.opponents.append(p2)
                p2.opponents.append(p1)
            if len(remaining) % 2 == 1:
                bye_player = remaining[-1]
                self.score_text.insert(tk.END, f"{bye_player.name} 輪空 (自動獲勝)\n")
                bye_player.points += 1
                bye_player.wins += 1
                self.match_history.append((1, bye_player.name, "輪空", "自動獲勝"))
            
            custom_window.destroy()

        ttk.Button(custom_window, text="確認配對", command=save_pairs, style="Large.TButton").pack(pady=10)

    def pair_players(self, round_num):
        self.tree.delete(*self.tree.get_children())
        if round_num == 1 and self.custom_pairs:
            self.score_text.insert(tk.END, f"\n第 {round_num} 輪配對（自訂）：\n")
            for p1, p2 in self.custom_pairs:
                self.tree.insert("", "end", values=(f"{p1.name} vs {p2.name}", ""))
            return self.custom_pairs
        else:
            # Use OMW for sorting
            players = sorted(self.players, key=lambda x: (x.points, x.get_omw(self.players, self.current_round)), reverse=True)
            import random
            if round_num == 1:
                random.shuffle(players)
            
            paired = []
            used = set()
            self.score_text.insert(tk.END, f"\n第 {round_num} 輪配對：\n")
            
            available_players = players.copy()
            while len(available_players) > 1:
                p1 = available_players.pop(0)
                if p1 in used:
                    continue
                
                best_opponent = None
                min_point_diff = float('inf')
                best_omw_diff = float('inf')
                
                for p2 in available_players:
                    if p2 not in used and p2 not in p1.opponents:
                        point_diff = abs(p1.points - p2.points)
                        omw_diff = abs(p1.get_omw(self.players, self.current_round) - p2.get_omw(self.players, self.current_round))
                        if point_diff < min_point_diff or (point_diff == min_point_diff and omw_diff < best_omw_diff):
                            min_point_diff = point_diff
                            best_omw_diff = omw_diff
                            best_opponent = p2
                
                if best_opponent:
                    paired.append((p1, best_opponent))
                    p1.opponents.append(best_opponent)
                    best_opponent.opponents.append(p1)
                    used.add(p1)
                    used.add(best_opponent)
                    available_players.remove(best_opponent)
                    self.tree.insert("", "end", values=(f"{p1.name} vs {best_opponent.name}", ""))
            
            if available_players:
                bye_player = available_players[0]
                self.score_text.insert(tk.END, f"{bye_player.name} 輪空 (自動獲勝)\n")
                bye_player.points += 1
                bye_player.wins += 1
                self.match_history.append((round_num, bye_player.name, "輪空", "自動獲勝"))
            
            return paired

    def input_results(self):
        if not self.paired_matches:
            messagebox.showerror("錯誤", "請先進行配對！")
            return

        self.root.title(f"瑞士輪模擬器 - 輸入第 {self.current_round} 輪結果")
        result_window = tk.Toplevel(self.root)
        result_window.title(f"輸入第 {self.current_round} 輪結果")
        window_height = 50 * len(self.paired_matches) + 150
        result_window.geometry(f"400x{window_height}")
        result_window.resizable(True, True)
        result_window.iconbitmap('')

        def on_result_window_close():
            self.root.title("瑞士輪模擬器")
            result_window.destroy()

        result_window.protocol("WM_DELETE_WINDOW", on_result_window_close)
        ttk.Label(result_window, text="選擇每場比賽的結果：", font=self.default_font).pack(pady=5)

        winner_vars = []
        for p1, p2 in self.paired_matches:
            frame = ttk.Frame(result_window)
            frame.pack(fill="x", pady=5)
            ttk.Label(frame, text=f"{p1.name} vs {p2.name}", font=self.default_font).pack(side="left", padx=5)
            var = tk.StringVar(value="")
            ttk.Combobox(frame, textvariable=var, values=[p1.name, p2.name, "雙敗"], state="readonly", font=self.default_font).pack(side="right", padx=5)
            winner_vars.append(var)

        def save_results():
            winners = [var.get() for var in winner_vars]
            if "" in winners:
                messagebox.showerror("錯誤", "請為每場比賽選擇一個結果！")
                return

            self.score_text.insert(tk.END, f"第 {self.current_round} 輪結果：\n")
            for i, (p1, p2) in enumerate(self.paired_matches):
                result = winners[i]
                if result == "雙敗":
                    p1.losses += 1
                    p2.losses += 1
                    self.tree.item(self.tree.get_children()[i], values=(f"{p1.name} vs {p2.name}", "雙敗"))
                    self.tree.tag_configure("double_loss", foreground="red")
                    self.tree.item(self.tree.get_children()[i], tags="double_loss")
                else:
                    winner = p1 if p1.name == result else p2
                    loser = p2 if p1.name == result else p1
                    winner.points += 1
                    winner.wins += 1
                    loser.losses += 1
                    self.tree.item(self.tree.get_children()[i], values=(f"{p1.name} vs {p2.name}", f"勝者: {winner.name}"))
                    self.tree.tag_configure("winner", foreground="green")
                    self.tree.item(self.tree.get_children()[i], tags="winner")
                
                self.match_history.append((self.current_round, p1.name, p2.name, result))
            
            self.update_scores()
            self.results_confirmed = True
            self.next_round_button.config(state="normal")
            self.root.title("瑞士輪模擬器")
            result_window.destroy()

        ttk.Button(result_window, text="確認結果", command=save_results, style="Large.TButton").pack(pady=10)

    def update_scores(self):
        self.score_text.insert(tk.END, "\n當前積分：\n")
        sorted_players = sorted(self.players, key=lambda x: (x.points, x.get_omw(self.players, self.current_round)), reverse=True)
        max_name_length = max(len(player.name) for player in sorted_players) + 2
        for player in sorted_players:
            record = f"{player.wins}-{player.losses}"
            if self.current_round <= 1:
                omw_display = "--"
            else:
                omw_value = player.get_omw(self.players, self.current_round)
                rating = self.get_omw_rating(omw_value)
                omw_display = f"{rating}; {omw_value:.2f}"
            line = f"{player.name:<{max_name_length}} | {record:^10} | {omw_display:>20}\n"
            self.score_text.insert(tk.END, line)

    def next_round(self):
        if not self.players:
            messagebox.showerror("錯誤", "請先輸入玩家姓名並確認！")
            return
        
        if self.current_round > 0 and not self.results_confirmed:
            messagebox.showerror("錯誤", "請先確認當前輪次的比賽結果！")
            return

        self.confirm_players_enabled = False
        self.confirm_players_button.config(state="disabled")

        if self.current_round >= self.rounds:
            self.score_text.insert(tk.END, "\n最終排名：\n")
            sorted_players = sorted(self.players, key=lambda x: (x.points, x.get_omw(self.players, self.current_round)), reverse=True)
            max_name_length = max(len(player.name) for player in sorted_players) + 2
            for i, player in enumerate(sorted_players, 1):
                record = f"{player.wins}-{player.losses}"
                omw_value = player.get_omw(self.players, self.current_round)
                rating = self.get_omw_rating(omw_value)
                omw_display = f"{rating}; {omw_value:.2f}"
                line = f"{i}. {player.name:<{max_name_length}} | {record:^10} | {omw_display:>20}\n"
                self.score_text.insert(tk.END, line)
            messagebox.showinfo("完成", "所有輪次已完成！")
            self.next_round_button.config(state="disabled")
            return

        self.current_round += 1
        self.results_confirmed = False
        self.next_round_button.config(state="disabled")
        if self.current_round == 1:
            self.custom_first_round_button.config(state="disabled")
        self.paired_matches = self.pair_players(self.current_round)
        self.current_round_label.config(text=f"目前輪次: {self.current_round}")  # Update round label
        self.input_results()

    def reset_confirm(self):
        if messagebox.askyesno("確認", "是否要重新開始？所有進度將清空！"):
            self.players = []
            self.rounds = 0
            self.current_round = 0
            self.custom_pairs = []
            self.paired_matches = []
            self.match_history = []
            self.results_confirmed = False
            self.next_round_button.config(state="disabled")
            self.custom_first_round_button.config(state="disabled")
            self.confirm_players_enabled = True
            self.confirm_players_button.config(state="normal")
            self.player_input.delete("1.0", tk.END)
            self.rounds_entry.delete(0, tk.END)
            self.rounds_entry.insert(0, "4")
            self.tree.delete(*self.tree.get_children())
            self.score_text.delete("1.0", tk.END)
            self.current_round_label.config(text="目前輪次: 0")  # Reset round label

    def export_to_csv(self):
        if not self.match_history:
            messagebox.showerror("錯誤", "目前沒有比賽記錄可匯出！")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"swiss_tournament_{timestamp}.csv"
        
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['Round', 'Player1', 'Player2', 'Result']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                for match in self.match_history:
                    writer.writerow({
                        'Round': match[0],
                        'Player1': match[1],
                        'Player2': match[2],
                        'Result': match[3]
                    })
                
                csvfile.write("\nFinal Standings\n")
                csvfile.write("Rank,Player,Points,Wins,Losses,Ties,OMW\n")
                sorted_players = sorted(self.players, key=lambda x: (x.points, x.get_omw(self.players, self.current_round)), reverse=True)
                for i, player in enumerate(sorted_players, 1):
                    omw = player.get_omw(self.players, self.current_round)
                    csvfile.write(f"{i},{player.name},{player.points},{player.wins},{player.losses},{player.ties},{omw:.2f}\n")

            messagebox.showinfo("成功", f"比賽記錄已匯出至 {filename}")
        except Exception as e:
            messagebox.showerror("錯誤", f"匯出失敗: {str(e)}")

    def show_rankings(self):
        if not self.players:
            messagebox.showerror("錯誤", "請先輸入玩家姓名並確認！")
            return

        ranking_window = tk.Toplevel(self.root)
        ranking_window.title("目前排名")
        ranking_window.geometry("450x500")
        ranking_window.resizable(True, True)
        ranking_window.iconbitmap('')

        # Use a Canvas with a Frame to allow per-cell coloring
        canvas = tk.Canvas(ranking_window)
        scrollbar = ttk.Scrollbar(ranking_window, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        ranking_frame = ttk.Frame(canvas)
        canvas.create_window((0, 0), window=ranking_frame, anchor="nw")

        # Headers
        ttk.Label(ranking_frame, text="排名", font=self.default_bold_font).grid(row=0, column=0, padx=5, pady=5)
        ttk.Label(ranking_frame, text="玩家", font=self.default_bold_font).grid(row=0, column=1, padx=5, pady=5)
        ttk.Label(ranking_frame, text="戰績 (勝-負)", font=self.default_bold_font).grid(row=0, column=2, padx=5, pady=5)
        ttk.Label(ranking_frame, text="對手綜合強度", font=self.default_bold_font).grid(row=0, column=3, padx=5, pady=5)

        # Player data
        sorted_players = sorted(self.players, key=lambda x: (x.points, x.get_omw(self.players, self.current_round)), reverse=True)
        for i, player in enumerate(sorted_players, 1):
            record = f"{player.wins}-{player.losses}"
            ttk.Label(ranking_frame, text=str(i), font=self.default_font).grid(row=i, column=0, padx=5, pady=2)
            ttk.Label(ranking_frame, text=player.name, font=self.default_font).grid(row=i, column=1, padx=5, pady=2, sticky="w")
            ttk.Label(ranking_frame, text=record, font=self.default_font).grid(row=i, column=2, padx=5, pady=2)
            if self.current_round <= 1:
                omw_display = "--"
                color = "black"
            else:
                omw_value = player.get_omw(self.players, self.current_round)
                rating = self.get_omw_rating(omw_value)
                omw_display = f"{rating}; {omw_value:.2f}"
                color = self.rating_colors.get(rating, "black")
            ttk.Label(ranking_frame, text=omw_display, font=self.default_font, foreground=color).grid(row=i, column=3, padx=5, pady=2)

        # Update scroll region
        ranking_frame.update_idletasks()
        canvas.configure(scrollregion=canvas.bbox("all"))

        ttk.Button(ranking_frame, text="關閉", command=ranking_window.destroy, style="Large.TButton").grid(row=len(sorted_players) + 1, column=0, columnspan=4, pady=10)

if __name__ == "__main__":
    root = tk.Tk()
    app = SwissSimulatorGUI(root)
    root.mainloop()