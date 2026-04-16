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

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AgentRole>("officer");
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}
