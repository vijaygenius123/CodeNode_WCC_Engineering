import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RoleProvider } from "./context/RoleContext";
import Layout from "./components/Layout";
import CaseList from "./pages/CaseList";
import CaseView from "./pages/CaseView";
import Compare from "./pages/Compare";
import Dashboard from "./pages/Dashboard";
import Resident from "./pages/Resident";

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<CaseList />} />
            <Route path="case/:caseId" element={<CaseView />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="resident" element={<Resident />} />
            <Route path="compare" element={<Compare />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}
