import { NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useRole } from "../context/RoleContext";
import type { AgentRole } from "../types";

const ROLES: { value: AgentRole; label: string; home: string }[] = [
  { value: "officer", label: "Caseworker", home: "/" },
  { value: "area_manager", label: "Team Leader", home: "/dashboard" },
  { value: "resident", label: "Applicant", home: "/resident" },
];

const DOMAIN_TABS = [
  { value: "all", label: "All" },
  { value: "planning", label: "Planning" },
  { value: "street", label: "Street" },
];

export default function Layout() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDomain = searchParams.get("domain") ?? "all";

  function handleRoleChange(newRole: AgentRole) {
    setRole(newRole);
    const target = ROLES.find((r) => r.value === newRole);
    if (target) navigate(target.home);
  }

  function handleDomainTab(domain: string) {
    setSearchParams({ domain });
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="govuk-header" role="banner">
        <div className="govuk-header__top">
          <NavLink to="/" className="govuk-header__logo-link">
            CaseView
          </NavLink>

          <nav
            className="govuk-header__role-switcher"
            aria-label="Switch role"
          >
            {ROLES.map((r) => (
              <button
                key={r.value}
                className={`role-pill${role === r.value ? " role-pill--active" : ""}`}
                onClick={() => handleRoleChange(r.value)}
                aria-pressed={role === r.value}
              >
                {r.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="govuk-header__domain-tabs">
          <div className="govuk-header__domain-tabs-inner">
            {DOMAIN_TABS.map((t) => (
              <button
                key={t.value}
                className={`domain-tab${activeDomain === t.value ? " domain-tab--active" : ""}`}
                onClick={() => handleDomainTab(t.value)}
                aria-pressed={activeDomain === t.value}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
