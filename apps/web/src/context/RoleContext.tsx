import { createContext, useContext, useState } from "react";
import type { AgentRole } from "../types";

interface RoleContextValue {
  role: AgentRole;
  setRole: (role: AgentRole) => void;
}

export const RoleContext = createContext<RoleContextValue>({
  role: "officer",
  setRole: () => undefined,
});

export function useRole() {
  return useContext(RoleContext);
}

function getInitialRole(): AgentRole {
  if (typeof window === "undefined") return "officer";
  const stored = localStorage.getItem("caseview-role");
  if (stored === "officer" || stored === "area_manager" || stored === "resident")
    return stored;
  return "officer";
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, rawSetRole] = useState<AgentRole>(getInitialRole);

  function setRole(r: AgentRole) {
    rawSetRole(r);
    localStorage.setItem("caseview-role", r);
  }

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}
