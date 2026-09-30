import { useState } from "react";
import type { ItemType } from "@/api/types";
import { useItemsList } from "@/api/hooks";
import { parseDecimal } from "@/lib/format";
import { ItemEditDialog } from "@/components/ItemEditDialog";

type FilterChip = "all" | "product" | "ingredient";

const FILTER_LABELS: Record<FilterChip, string> = {
  all: "All",
  product: "Product",
  ingredient: "Ingredient",
};

/** Items only now - recipes/meals moved out (see design discussion:
 * "the item editor should not list recipes and meals"). They'll get
 * their own dedicated editor page instead, since their shape (an
 * ingredients list, eventually instructions) doesn't fit this table
 * well anyway. */
export function ItemEditorPage() {
  const [filter, setFilter] = useState<FilterChip>("all");
  const [query, setQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);

  const itemsQuery = useItemsList();

  // Client-side, not a server search - the whole list is already
  // loaded for the type-filter chips above, so this is just one more
  // pass over data already in memory rather than a request per
  // keystroke.
  const normalizedQuery = query.trim().toLowerCase();
  const rows = (itemsQuery.data ?? [])
    .filter((item) => filter === "all" || filter === (item.type as ItemType))
    .filter(
      (item) =>
        normalizedQuery === "" ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        (item.brand ?? "").toLowerCase().includes(normalizedQuery),
    );

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Item Editor</h1>
        <button
          onClick={() => {
            setEditingItemId(null);
            setShowItemDialog(true);
          }}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
        >
          + New item
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items..."
        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-3"
      />

      <div className="flex gap-1.5 mb-3">
        {(Object.keys(FILTER_LABELS) as FilterChip[]).map((chip) => (
          <button
            key={chip}
            onClick={() => setFilter(chip)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === chip ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            }`}
          >
            {FILTER_LABELS[chip]}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <th className="px-4 py-2 font-normal">Name</th>
              <th className="px-4 py-2 font-normal">Type</th>
              <th className="px-4 py-2 font-normal">Calories</th>
              <th className="px-4 py-2 font-normal">Stores</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.item_id}
                onClick={() => {
                  setEditingItemId(item.item_id);
                  setShowItemDialog(true);
                }}
                className="border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{item.brand ? `${item.name} (${item.brand})` : item.name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 capitalize">{item.type}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {item.kcal_100g ? `${Math.round(parseDecimal(item.kcal_100g))}/100g` : "-"}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {item.grocery_stores.length > 0 ? item.grocery_stores.map((s) => s.name).join(", ") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Nothing here yet</div>}
      </div>

      {showItemDialog && <ItemEditDialog itemId={editingItemId} onClose={() => setShowItemDialog(false)} />}
    </div>
  );
}