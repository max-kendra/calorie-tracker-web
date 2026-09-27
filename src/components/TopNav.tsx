import { NavLink } from "react-router-dom";
import { useTheme } from "@/lib/useTheme";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/recipes", label: "Recipes" },
  { to: "/grocery-list", label: "Grocery List" },
  { to: "/items", label: "Item Editor" },
  { to: "/goals", label: "Goals" },
  { to: "/settings", label: "Settings" },
];

export function TopNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm mb-4">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center gap-1">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition ${
                isActive
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
        <button
          onClick={toggleTheme}
          className="ml-auto text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-lg px-2"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? "\u2600" : "\u263D"}
        </button>
      </div>
    </nav>
  );
}