import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RoleProvider, useRole } from "./context/RoleContext";
import Layout from "./components/Layout";
import CaseList from "./pages/CaseList";
import CaseView from "./pages/CaseView";
import Compare from "./pages/Compare";
import Dashboard from "./pages/Dashboard";
import Resident from "./pages/Resident";
import type { AgentRole } from "./types";

function RoleGuard({
  allowed,
  redirect,
  children,
}: {
  allowed: AgentRole[];
  redirect: string;
  children: React.ReactNode;
}) {
  const { role } = useRole();
  if (!allowed.includes(role)) return <Navigate to={redirect} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              index
              element={
                <RoleGuard allowed={["officer", "area_manager"]} redirect="/resident">
                  <CaseList />
                </RoleGuard>
              }
            />
            <Route
              path="case/:caseId"
              element={
                <RoleGuard allowed={["officer", "area_manager"]} redirect="/resident">
                  <CaseView />
                </RoleGuard>
              }
            />
            <Route
              path="dashboard"
              element={
                <RoleGuard allowed={["officer", "area_manager"]} redirect="/resident">
                  <Dashboard />
                </RoleGuard>
              }
            />
            <Route path="resident" element={<Resident />} />
            <Route
              path="compare"
              element={
                <RoleGuard allowed={["officer", "area_manager"]} redirect="/resident">
                  <Compare />
                </RoleGuard>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}
