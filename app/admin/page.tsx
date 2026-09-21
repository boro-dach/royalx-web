"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/telegram/api-fetch";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import {
  Shield,
  Users,
  DollarSign,
  UserX,
  Search,
  RefreshCw,
  ChevronLeft,
  Copy,
  Check,
  Percent,
  Sliders,
  AlertTriangle,
  BadgeCheck,
  Clock,
  X,
  Gamepad2,
  Plus,
  Trash2,
  Edit2,
  Crown,
} from "lucide-react";

type AdminUser = {
  id: number;
  username: string | null;
  firstName: string | null;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  isBanned: boolean;
  isAdmin: boolean;
  kycStatus: "none" | "pending" | "approved" | "rejected";
  balanceCents: number;
  individualRtp: { rtp: number; gameCode: string | null; id: number } | null;
};

type AdminStats = {
  totalUsers: number;
  bannedUsers: number;
  verifiedUsers: number;
  pendingKycUsers: number;
  totalBalanceCents: number;
  totalRounds: number;
  customRtpCount: number;
};

type AdminGame = {
  code: string;
  name: string;
  defaultRtp: number;
  minBetCents: number;
  maxBetCents: number;
  active: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("users");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // User edit modal states
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newBalanceDollars, setNewBalanceDollars] = useState<string>("");
  const [rtpPercent, setRtpPercent] = useState<string>("");
  const [isBannedVal, setIsBannedVal] = useState<boolean>(false);
  const [isAdminVal, setIsAdminVal] = useState<boolean>(false);
  const [kycStatusVal, setKycStatusVal] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Game create/edit modal states
  const [selectedGame, setSelectedGame] = useState<AdminGame | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [gameCodeVal, setGameCodeVal] = useState("");
  const [gameNameVal, setGameNameVal] = useState("");
  const [gameRtpPercent, setGameRtpPercent] = useState("97");
  const [gameMinBetDollars, setGameMinBetDollars] = useState("1.00");
  const [gameMaxBetDollars, setGameMaxBetDollars] = useState("1000.00");
  const [gameActiveVal, setGameActiveVal] = useState(true);
  const [gameStatusMessage, setGameStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Fetch Stats
  const { data: stats, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/stats");
      if (!res.ok) throw new Error("STATS_FAILED");
      return res.json();
    },
    staleTime: 15_000,
  });

  // 2. Fetch Users
  const {
    data: usersData,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin", "users", search, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (filter !== "all") params.set("filter", filter);
      const res = await apiFetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        throw new Error("USERS_FAILED");
      }
      return res.json();
    },
    staleTime: 10_000,
  });

  // 3. Fetch Games
  const {
    data: gamesData,
    isLoading: isGamesLoading,
    refetch: refetchGames,
  } = useQuery<{ games: AdminGame[] }>({
    queryKey: ["admin", "games"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/games");
      if (!res.ok) throw new Error("GAMES_FAILED");
      return res.json();
    },
    staleTime: 15_000,
  });

  // 4. User update mutation
  const userUpdateMutation = useMutation({
    mutationFn: async (payload: {
      userId: number;
      balanceCents?: number;
      individualRtp?: number | null;
      isBanned?: boolean;
      isAdmin?: boolean;
      kycStatus?: "none" | "pending" | "approved" | "rejected";
    }) => {
      const { userId, ...data } = payload;
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "UPDATE_FAILED");
      return body.user;
    },
    onSuccess: (updatedUser) => {
      setStatusMessage({ type: "success", text: "Изменения успешно сохранены!" });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setSelectedUser(updatedUser);
      setTimeout(() => {
        setStatusMessage(null);
        setSelectedUser(null);
      }, 1000);
    },
    onError: (err: Error) => {
      setStatusMessage({ type: "error", text: err.message || "Ошибка при сохранении" });
    },
  });

  // 5. Game create/update mutation
  const gameSaveMutation = useMutation({
    mutationFn: async (payload: {
      isCreate: boolean;
      code: string;
      name: string;
      defaultRtp: number;
      minBetCents: number;
      maxBetCents: number;
      active: boolean;
    }) => {
      const { isCreate, code, ...data } = payload;
      const url = isCreate ? "/api/admin/games" : `/api/admin/games/${code}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCreate ? { code, ...data } : data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "GAME_SAVE_FAILED");
      return body.game;
    },
    onSuccess: () => {
      setGameStatusMessage({ type: "success", text: "Игра успешно сохранена!" });
      queryClient.invalidateQueries({ queryKey: ["admin", "games"] });
      setTimeout(() => {
        setGameStatusMessage(null);
        setIsGameModalOpen(false);
      }, 900);
    },
    onError: (err: Error) => {
      setGameStatusMessage({ type: "error", text: err.message || "Ошибка сохранения игры" });
    },
  });

  // 6. Game delete mutation
  const gameDeleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiFetch(`/api/admin/games/${code}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "DELETE_FAILED");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "games"] });
    },
    onError: (err: Error) => {
      alert(err.message || "Ошибка удаления игры");
    },
  });

  const openUserEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setNewBalanceDollars((user.balanceCents / 100).toFixed(2));
    setRtpPercent(user.individualRtp ? (user.individualRtp.rtp * 100).toFixed(0) : "");
    setIsBannedVal(user.isBanned);
    setIsAdminVal(user.isAdmin);
    setKycStatusVal(user.kycStatus);
    setStatusMessage(null);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;

    const parsedBalance = parseFloat(newBalanceDollars);
    const balanceCents = !isNaN(parsedBalance) ? Math.round(parsedBalance * 100) : undefined;

    let individualRtp: number | null | undefined = undefined;
    if (rtpPercent.trim() === "") {
      individualRtp = null; // Clear override
    } else {
      const parsedRtp = parseFloat(rtpPercent);
      if (!isNaN(parsedRtp) && parsedRtp > 0 && parsedRtp <= 200) {
        individualRtp = parsedRtp / 100;
      }
    }

    userUpdateMutation.mutate({
      userId: selectedUser.id,
      balanceCents,
      individualRtp,
      isBanned: isBannedVal,
      isAdmin: isAdminVal,
      kycStatus: kycStatusVal,
    });
  };

  const openCreateGameModal = () => {
    setSelectedGame(null);
    setIsCreatingGame(true);
    setGameCodeVal("");
    setGameNameVal("");
    setGameRtpPercent("97");
    setGameMinBetDollars("1.00");
    setGameMaxBetDollars("1000.00");
    setGameActiveVal(true);
    setGameStatusMessage(null);
    setIsGameModalOpen(true);
  };

  const openEditGameModal = (game: AdminGame) => {
    setSelectedGame(game);
    setIsCreatingGame(false);
    setGameCodeVal(game.code);
    setGameNameVal(game.name);
    setGameRtpPercent((game.defaultRtp * 100).toFixed(1));
    setGameMinBetDollars((game.minBetCents / 100).toFixed(2));
    setGameMaxBetDollars((game.maxBetCents / 100).toFixed(2));
    setGameActiveVal(game.active);
    setGameStatusMessage(null);
    setIsGameModalOpen(true);
  };

  const handleSaveGame = () => {
    const rtp = parseFloat(gameRtpPercent);
    const minBet = parseFloat(gameMinBetDollars);
    const maxBet = parseFloat(gameMaxBetDollars);

    if (isNaN(rtp) || rtp <= 0 || rtp > 200) {
      setGameStatusMessage({ type: "error", text: "Укажите корректный RTP (от 1 до 200%)" });
      return;
    }
    if (!gameNameVal.trim()) {
      setGameStatusMessage({ type: "error", text: "Укажите название игры" });
      return;
    }
    if (isCreatingGame && !gameCodeVal.trim()) {
      setGameStatusMessage({ type: "error", text: "Укажите уникальный код игры" });
      return;
    }

    gameSaveMutation.mutate({
      isCreate: isCreatingGame,
      code: gameCodeVal.trim(),
      name: gameNameVal.trim(),
      defaultRtp: rtp / 100,
      minBetCents: Math.round((isNaN(minBet) ? 1 : minBet) * 100),
      maxBetCents: Math.round((isNaN(maxBet) ? 1000 : maxBet) * 100),
      active: gameActiveVal,
    });
  };

  const handleDeleteGame = (game: AdminGame) => {
    if (confirm(`Вы уверены, что хотите удалить игру "${game.name}" (${game.code})?`)) {
      gameDeleteMutation.mutate(game.code);
    }
  };

  const copyId = (id: number) => {
    navigator.clipboard.writeText(String(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col w-full min-h-dvh bg-zinc-950 text-white p-4 pb-20 gap-5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/me")}
            className="rounded-xl"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-purple-400" />
              <h1 className="text-xl font-black tracking-tight">Админ-панель</h1>
            </div>
            <p className="text-xs text-zinc-400">Управление пользователями, играми и RTP</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-white/10 flex items-center gap-1.5 font-bold"
          onClick={() => {
            refetchStats();
            refetchUsers();
            refetchGames();
          }}
        >
          <RefreshCw className="size-3.5" />
          Обновить
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card className="border-white/10 bg-zinc-900/60">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Игроков</span>
              <Users className="size-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {stats?.totalUsers ?? "—"}
            </p>
            <p className="text-[10px] text-zinc-500">Зарегистрировано</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-zinc-900/60">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Общий баланс</span>
              <DollarSign className="size-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">
              ${((stats?.totalBalanceCents ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-[10px] text-zinc-500">На всех кошельках</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-zinc-900/60">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">В бане</span>
              <UserX className="size-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400">
              {stats?.bannedUsers ?? 0}
            </p>
            <p className="text-[10px] text-zinc-500">Заблокировано</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-zinc-900/60">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Верификация</span>
              <BadgeCheck className="size-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-400">
              {stats?.verifiedUsers ?? 0}
            </p>
            <p className="text-[10px] text-zinc-500">
              {stats?.pendingKycUsers ? `${stats.pendingKycUsers} ждут проверки` : "Одобрено KYC"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Users vs Games */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11 bg-zinc-900 border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="users" className="flex items-center gap-2 font-bold text-sm">
            <Users className="size-4" />
            Пользователи ({usersData?.users.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2 font-bold text-sm">
            <Gamepad2 className="size-4" />
            Управление играми ({gamesData?.games.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ================= TABS CONTENT: USERS ================= */}
        <TabsContent value="users" className="flex flex-col gap-4 mt-4">
          {/* Search and Filters */}
          <div className="flex flex-col gap-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                placeholder="Поиск по ID, username (@user) или имени..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-zinc-900 border-white/10 rounded-xl text-sm"
              />
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: "all", label: "Все игроки" },
                { id: "admins", label: "Администраторы" },
                { id: "banned", label: "Заблокированные" },
                { id: "pending_kyc", label: "Ожидают KYC" },
                { id: "verified", label: "Верифицированные" },
                { id: "custom_rtp", label: "Индивидуальный RTP" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors ${
                    filter === item.id
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Users List */}
          <div className="flex flex-col gap-3">
            {isUsersLoading ? (
              <div className="flex items-center justify-center p-12 text-zinc-400">
                <RefreshCw className="size-6 animate-spin mr-2" /> Загрузка пользователей...
              </div>
            ) : usersData?.users.length === 0 ? (
              <Card className="border-white/10 bg-zinc-900/30 p-8 text-center text-zinc-400">
                Пользователи не найдены
              </Card>
            ) : (
              usersData?.users.map((user) => (
                <Card
                  key={user.id}
                  className="border-white/10 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="size-11 rounded-xl object-cover shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="size-11 rounded-xl bg-purple-950 text-purple-300 font-bold flex items-center justify-center shrink-0 border border-purple-500/20">
                            {user.displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-white truncate text-base">
                              {user.displayName}
                            </p>
                            {user.isAdmin && (
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] px-1.5 py-0 flex items-center gap-1">
                                <Crown className="size-3 text-amber-400" /> Admin
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            {user.username && <span>@{user.username}</span>}
                            <button
                              onClick={() => copyId(user.id)}
                              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                              title="Скопировать ID"
                            >
                              <span>#{user.id}</span>
                              {copiedId === user.id ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="font-bold bg-purple-600 hover:bg-purple-500 shrink-0"
                        onClick={() => openUserEditModal(user)}
                      >
                        <Sliders className="size-3.5 mr-1" />
                        Управление
                      </Button>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-white/5">
                      {/* Ban Badge */}
                      {user.isBanned ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <UserX className="size-3" /> Заблокирован
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          Активен
                        </Badge>
                      )}

                      {/* KYC Badge */}
                      {user.kycStatus === "approved" ? (
                        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 flex items-center gap-1">
                          <BadgeCheck className="size-3" /> KYC Одобрен
                        </Badge>
                      ) : user.kycStatus === "pending" ? (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 flex items-center gap-1">
                          <Clock className="size-3" /> KYC Ожидает
                        </Badge>
                      ) : user.kycStatus === "rejected" ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <X className="size-3" /> KYC Отклонён
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-zinc-400">
                          KYC: Нет
                        </Badge>
                      )}

                      {/* User Individual RTP Badge */}
                      {user.individualRtp ? (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold flex items-center gap-1">
                          <Percent className="size-3" /> Личный RTP: {(user.individualRtp.rtp * 100).toFixed(0)}% (На все игры)
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-zinc-400">
                          RTP: Базовый
                        </Badge>
                      )}
                    </div>

                    {/* Balance & Info */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 bg-black/30 p-2.5 rounded-lg">
                      <div>
                        <span className="text-zinc-500 mr-1.5">Баланс:</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          ${(user.balanceCents / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {user.lastSeenAt
                          ? `Был: ${new Date(user.lastSeenAt).toLocaleDateString("ru-RU")}`
                          : `Рег: ${new Date(user.createdAt).toLocaleDateString("ru-RU")}`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ================= TABS CONTENT: GAMES ================= */}
        <TabsContent value="games" className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Список игр</h2>
              <p className="text-xs text-zinc-400">Управление доступными играми, ставками и базовым RTP</p>
            </div>
            <Button
              className="bg-purple-600 hover:bg-purple-500 font-bold flex items-center gap-1.5"
              size="sm"
              onClick={openCreateGameModal}
            >
              <Plus className="size-4" /> Добавить игру
            </Button>
          </div>

          {isGamesLoading ? (
            <div className="flex items-center justify-center p-12 text-zinc-400">
              <RefreshCw className="size-6 animate-spin mr-2" /> Загрузка игр...
            </div>
          ) : gamesData?.games.length === 0 ? (
            <Card className="border-white/10 bg-zinc-900/30 p-8 text-center text-zinc-400">
              Игры не найдены
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gamesData?.games.map((game) => (
                <Card
                  key={game.code}
                  className="border-white/10 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">{game.name}</h3>
                          <Badge
                            variant={game.active ? "default" : "secondary"}
                            className={game.active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]" : "text-[10px]"}
                          >
                            {game.active ? "Активна" : "Отключена"}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono">код: {game.code}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-zinc-400 hover:text-white"
                          onClick={() => openEditGameModal(game)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          onClick={() => handleDeleteGame(game)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-black/30 p-2.5 rounded-lg text-center text-xs">
                      <div>
                        <p className="text-zinc-500 text-[10px]">Базовый RTP</p>
                        <p className="font-bold text-purple-300 text-sm">
                          {(game.defaultRtp * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-[10px]">Мин. ставка</p>
                        <p className="font-bold text-white text-sm">
                          ${(game.minBetCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-[10px]">Макс. ставка</p>
                        <p className="font-bold text-white text-sm">
                          ${(game.maxBetCents / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ================= USER EDIT DIALOG ================= */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sliders className="size-5 text-purple-400" />
              Управление игроком
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              {selectedUser?.displayName} (#{selectedUser?.id})
            </DialogDescription>
          </DialogHeader>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/60 border border-rose-500/30 text-rose-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex flex-col gap-4 py-2">
            {/* 1. Balance */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-400" />
                  Баланс ($ USD)
                </label>
                <span className="text-xs text-zinc-500">
                  Текущий: ${(selectedUser ? selectedUser.balanceCents / 100 : 0).toFixed(2)}
                </span>
              </div>

              <Input
                type="number"
                step="0.01"
                min="0"
                value={newBalanceDollars}
                onChange={(e) => setNewBalanceDollars(e.target.value)}
                className="bg-zinc-950 border-white/10 text-emerald-400 font-bold text-lg"
              />

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[10, 50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs px-2.5 font-bold"
                    onClick={() => {
                      const cur = parseFloat(newBalanceDollars) || 0;
                      setNewBalanceDollars((cur + amount).toFixed(2));
                    }}
                  >
                    +{amount}$
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2 text-rose-400 hover:text-rose-300 border-white/10"
                  onClick={() => setNewBalanceDollars("0.00")}
                >
                  Сбросить
                </Button>
              </div>
            </div>

            {/* 2. Individual RTP (Per User across all games) */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Percent className="size-4 text-purple-400" />
                  Индивидуальный RTP игрока (%)
                </label>
                <span className="text-xs text-purple-400 font-bold">
                  На все игры
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="150"
                  placeholder="Оставьте пустым для базового RTP игр"
                  value={rtpPercent}
                  onChange={(e) => setRtpPercent(e.target.value)}
                  className="bg-zinc-950 border-white/10 font-bold"
                />
                {rtpPercent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-9 text-xs border-white/10"
                    onClick={() => setRtpPercent("")}
                  >
                    Сбросить
                  </Button>
                )}
              </div>

              {/* RTP Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  { label: "50% (Слив)", val: "50" },
                  { label: "80%", val: "80" },
                  { label: "90%", val: "90" },
                  { label: "95%", val: "95" },
                  { label: "97% (Дефолт)", val: "97" },
                  { label: "110% (Плюс)", val: "110" },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setRtpPercent(preset.val)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      rtpPercent === preset.val
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-zinc-900 text-zinc-400 hover:text-white border-white/5"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Этот RTP будет применяться ко всем играм для этого пользователя вместо стандартного процента отдачи.
              </p>
            </div>

            {/* 3. Admin Rights */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/5">
              <div>
                <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Crown className="size-4 text-amber-400" />
                  Права администратора
                </p>
                <p className="text-[11px] text-zinc-500">
                  Доступ к панели управления, балансам и настройкам игр
                </p>
              </div>

              <Switch
                checked={isAdminVal}
                onCheckedChange={setIsAdminVal}
              />
            </div>

            {/* 4. Ban / Block */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/5">
              <div>
                <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <UserX className="size-4 text-rose-400" />
                  Блокировка аккаунта
                </p>
                <p className="text-[11px] text-zinc-500">
                  Заблокированный игрок не сможет делать ставки и авторизовываться
                </p>
              </div>

              <Switch
                checked={isBannedVal}
                onCheckedChange={setIsBannedVal}
                className="data-[state=checked]:bg-rose-600"
              />
            </div>

            {/* 5. Verification (KYC) */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-black/40 border border-white/5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <BadgeCheck className="size-4 text-blue-400" />
                Статус верификации (KYC)
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "none", label: "Не верифицирован" },
                  { id: "pending", label: "На проверке" },
                  { id: "approved", label: "Верифицирован" },
                  { id: "rejected", label: "Отклонён" },
                ].map((status) => (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() =>
                      setKycStatusVal(
                        status.id as "none" | "pending" | "approved" | "rejected"
                      )
                    }
                    className={`p-2 rounded-lg font-medium border text-left flex items-center justify-between transition-colors ${
                      kycStatusVal === status.id
                        ? "bg-blue-600/30 border-blue-500 text-blue-200"
                        : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>{status.label}</span>
                    {kycStatusVal === status.id && <Check className="size-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedUser(null)}
              className="border-white/10"
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-500 font-bold"
              onClick={handleSaveUser}
              disabled={userUpdateMutation.isPending}
            >
              {userUpdateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= GAME CREATE / EDIT MODAL ================= */}
      <Dialog open={isGameModalOpen} onOpenChange={setIsGameModalOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="size-5 text-purple-400" />
              {isCreatingGame ? "Создание новой игры" : `Редактирование: ${selectedGame?.name}`}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Базовые параметры игры, дефолтный RTP и лимиты ставок
            </DialogDescription>
          </DialogHeader>

          {gameStatusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                gameStatusMessage.type === "success"
                  ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/60 border border-rose-500/30 text-rose-300"
              }`}
            >
              {gameStatusMessage.type === "success" ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span>{gameStatusMessage.text}</span>
            </div>
          )}

          <div className="flex flex-col gap-3.5 py-2">
            {/* Code & Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Код игры (ID)</label>
                <Input
                  placeholder="mines"
                  disabled={!isCreatingGame}
                  value={gameCodeVal}
                  onChange={(e) => setGameCodeVal(e.target.value)}
                  className="bg-zinc-950 border-white/10 font-mono text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Название</label>
                <Input
                  placeholder="Mines"
                  value={gameNameVal}
                  onChange={(e) => setGameNameVal(e.target.value)}
                  className="bg-zinc-950 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Default RTP */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Percent className="size-4 text-purple-400" />
                  Базовый RTP игры (%)
                </label>
                <span className="text-xs text-purple-300 font-bold">{gameRtpPercent}%</span>
              </div>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="150"
                value={gameRtpPercent}
                onChange={(e) => setGameRtpPercent(e.target.value)}
                className="bg-zinc-950 border-white/10 font-bold text-sm"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {["90", "94", "95", "96", "97", "98"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGameRtpPercent(val)}
                    className={`px-2 py-0.5 rounded text-[11px] border ${
                      gameRtpPercent === val
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-zinc-950 text-zinc-400 border-white/5"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Min & Max Bet */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Мин. ставка ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={gameMinBetDollars}
                  onChange={(e) => setGameMinBetDollars(e.target.value)}
                  className="bg-zinc-950 border-white/10 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Макс. ставка ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={gameMaxBetDollars}
                  onChange={(e) => setGameMaxBetDollars(e.target.value)}
                  className="bg-zinc-950 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <div>
                <p className="text-xs font-bold text-white">Статус активности</p>
                <p className="text-[11px] text-zinc-500">Доступность игры для ставок игроками</p>
              </div>
              <Switch checked={gameActiveVal} onCheckedChange={setGameActiveVal} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGameModalOpen(false)}
              className="border-white/10"
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-500 font-bold"
              onClick={handleSaveGame}
              disabled={gameSaveMutation.isPending}
            >
              {gameSaveMutation.isPending ? "Сохранение..." : isCreatingGame ? "Создать игру" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
