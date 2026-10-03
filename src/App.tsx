import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MakePickPage } from "./pages/MakePickPage";
import { PlayerHistoryPage } from "./pages/PlayerHistoryPage";
import { StandingsPage } from "./pages/StandingsPage";
import { TeamUsagePage } from "./pages/TeamUsagePage";
import { WeekHistoryPage } from "./pages/WeekHistoryPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pick" element={<MakePickPage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/history" element={<WeekHistoryPage />} />
        <Route path="/history/player" element={<PlayerHistoryPage />} />
        <Route path="/teams" element={<TeamUsagePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
