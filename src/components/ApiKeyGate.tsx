import { useState, type ReactNode } from "react";
import { getStoredApiKey, setStoredApiKey, UnauthorizedError } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";

export function ApiKeyGate({ children }: { children: ReactNode }) {
  const [hasKey, setHasKey] = useState(() => getStoredApiKey() !== null);
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  function submit() {
    if (!input.trim()) return;
    setStoredApiKey(input.trim());
    setHasKey(true);
    queryClient.invalidateQueries();
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 w-full max-w-sm">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Meal Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter your API key to continue.</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-3"
            placeholder="API key"
            autoFocus
          />
          <button
            onClick={submit}
            className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-600"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export { UnauthorizedError };