import { createContext } from "react";
import type { SessionPlayer } from "../types";

export interface AuthContextValue {
  token: string | null;
  player: SessionPlayer | null;
  setSession: (token: string, player: SessionPlayer) => void;
  clearSession: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
