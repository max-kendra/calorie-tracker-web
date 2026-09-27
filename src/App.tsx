import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApiKeyGate } from "@/components/ApiKeyGate";
import { TopNav } from "@/components/TopNav";
import { WeekView } from "@/pages/WeekView";
import { RecipesPage } from "@/pages/RecipesPage";
import { GroceryListPage } from "@/pages/GroceryListPage";
import { ItemEditorPage } from "@/pages/ItemEditorPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { SettingsPage } from "@/pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiKeyGate>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <BrowserRouter>
            <TopNav />
            <Routes>
              <Route path="/" element={<WeekView />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/grocery-list" element={<GroceryListPage />} />
              <Route path="/items" element={<ItemEditorPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </BrowserRouter>
        </div>
      </ApiKeyGate>
    </QueryClientProvider>
  );
}