import { NavLink, Outlet } from "react-router-dom";

export default function SettingsLayout() {
  const navItems = [
    { name: "General", path: "/dashboard/settings/general" },
    { name: "Authentication", path: "/dashboard/settings/security" },
    { name: "Billing", path: "/dashboard/settings/billing", disabled: true },
  ];

  return (
    <div className="max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans pb-12 pt-4">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
        {/* Left Side: Settings Sub-Navigation */}
        <nav className="w-full md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {navItems.map((item) => (
            item.disabled ? (
              <div key={item.name} className="px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
                {item.name}
              </div>
            ) : (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-foreground/10 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  }`
                }
              >
                {item.name}
              </NavLink>
            )
          ))}
        </nav>

        {/* Right Side: Tab Content */}
        <div className="flex-1 w-full max-w-4xl space-y-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}