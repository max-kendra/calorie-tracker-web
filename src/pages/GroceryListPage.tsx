import { useState } from "react";
import type { GroceryListEntry } from "@/api/types";
import {
  useCreatePlaceholderGroceryEntry,
  useCreateTrip,
  useDeleteGroceryEntry,
  useDeleteTrip,
  useGroceryEntries,
  useGroceryStores,
  useItemSearch,
  useTrips,
  useUpdateGroceryEntry,
} from "@/api/hooks";
import { toIsoDate } from "@/lib/dates";
import { usdaFoodToPrefill, type ItemFormPrefill } from "@/lib/itemPrefill";
import { ItemEditDialog } from "@/components/ItemEditDialog";
import { UsdaSearchPanel } from "@/components/UsdaSearchPanel";

const ANY_STORE = "__any__";

function isCompatible(entry: GroceryListEntry, tripStoreId: number | null): boolean {
  // A trip with no store accepts anything. A trip WITH a store only
  // accepts items that are store-agnostic (no stores at all) or that
  // explicitly carry that store - matches the backend's own
  // _check_trip_compatibility exactly, checked here too so a drop
  // that's going to fail never even LOOKS like it worked, rather than
  // relying on the backend's rejection alone.
  if (tripStoreId == null) return true;
  if (entry.grocery_stores.length === 0) return true;
  return entry.grocery_stores.some((s) => s.id === tripStoreId);
}

/** Inline search shown when resolving a placeholder into a real item
 * (see design discussion: the hot dog buns example - "I'd still like
 * to add it to the grocery list and then replace it with the actual
 * information of the product I did get"). Same search-then-select
 * shape as AddItemDialog, just embedded directly in the card instead
 * of a separate dialog. */
function ResolvePlaceholderSearch({ entryId, onDone }: { entryId: number; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const itemsQuery = useItemSearch(query);
  const updateEntry = useUpdateGroceryEntry();
  // USDA fallback (see design discussion), same shape as the add-to-meal
  // and recipe-ingredient searches - nothing matched among your own
  // items, so offer to look it up and create a real item from it. A
  // picked result resolves the placeholder immediately once created,
  // rather than just selecting it for a further step - resolving IS
  // the whole action here.
  const [showUsda, setShowUsda] = useState(false);
  const [usdaPrefill, setUsdaPrefill] = useState<ItemFormPrefill | null>(null);

  const hasQuery = query.trim().length > 0;
  const results = (itemsQuery.data ?? []).slice(0, 5);

  return (
    <div className="mt-1 border-t border-gray-200 dark:border-gray-600 pt-1">
      {showUsda ? (
        <UsdaSearchPanel
          initialQuery={query.trim()}
          onPick={(food) => setUsdaPrefill(usdaFoodToPrefill(food))}
          onBack={() => setShowUsda(false)}
        />
      ) : (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for the real item..."
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs mb-1"
          />
          {hasQuery &&
            results.map((item) => (
              <button
                key={item.item_id}
                onClick={() => updateEntry.mutate({ entryId, itemId: item.item_id }, { onSuccess: onDone })}
                className="w-full text-left text-xs py-1 px-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded truncate"
              >
                {item.brand ? `${item.name} (${item.brand})` : item.name}
              </button>
            ))}
          {hasQuery && !itemsQuery.isFetching && results.length === 0 && (
            <div className="text-center py-2">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">No matches</div>
              <button
                onClick={() => setShowUsda(true)}
                className="px-2 py-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600"
              >
                Search USDA for "{query.trim()}"
              </button>
            </div>
          )}
          {hasQuery && results.length > 0 && (
            <button
              onClick={() => setShowUsda(true)}
              className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline py-1"
            >
              Not finding it? Search USDA
            </button>
          )}
          <button onClick={onDone} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 mt-1">
            Cancel
          </button>
        </>
      )}

      {usdaPrefill && (
        <ItemEditDialog
          itemId={null}
          stacked
          prefill={usdaPrefill}
          onClose={() => setUsdaPrefill(null)}
          onCreated={(created) => {
            setUsdaPrefill(null);
            updateEntry.mutate({ entryId, itemId: created.item_id }, { onSuccess: onDone });
          }}
        />
      )}
    </div>
  );
}

function EntryCard({ entry, onDragStart, onDelete }: {
  entry: GroceryListEntry;
  onDragStart: (e: React.DragEvent, entry: GroceryListEntry) => void;
  onDelete: (entry: GroceryListEntry) => void;
}) {
  const updateEntry = useUpdateGroceryEntry();
  const [quantityInput, setQuantityInput] = useState(entry.quantity ?? "");
  const [resolving, setResolving] = useState(false);

  function handleQuantityBlur() {
    const trimmed = quantityInput.trim();
    if (trimmed === (entry.quantity ?? "")) return;
    updateEntry.mutate({ entryId: entry.id, quantity: trimmed || null });
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, entry)}
      className="bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5 mb-1 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{entry.item_name}</span>
        <button onClick={() => onDelete(entry)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 text-sm shrink-0 px-1">
          &times;
        </button>
      </div>
      {entry.is_placeholder && !resolving && (
        <button
          onClick={() => setResolving(true)}
          className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-1.5 py-0.5 mt-1 inline-block"
        >
          Still needs info - tap to find the real item
        </button>
      )}
      {resolving && <ResolvePlaceholderSearch entryId={entry.id} onDone={() => setResolving(false)} />}
      <input
        value={quantityInput}
        onChange={(e) => setQuantityInput(e.target.value)}
        onBlur={handleQuantityBlur}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="Quantity (optional)"
        className="w-full mt-1 bg-transparent border-none text-xs text-gray-500 dark:text-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none"
      />
    </div>
  );
}

/** Pool grouped by store, trips as their own columns - dragging an
 * entry between them is the whole feature. Each trip is assigned AT
 * MOST one store (see design discussion - revised from an earlier
 * any-store-with-a-filter design: one store per trip is closer to how
 * shopping trips actually work, and it means a trip can actually
 * REJECT an incompatible drop rather than silently accepting anything
 * with just a filter to sort it out visually afterward). Plain native
 * HTML5 drag-and-drop, not a touch-aware library - this is PC-only.
 *
 * Placeholder entries (see design discussion: the hot dog buns
 * example) have no real item/stores yet, so they always land in the
 * "Any store" bucket and are always drag-compatible with every trip -
 * "resolving" one into a real item happens right in its own card, not
 * a separate flow. Deliberately no hard gate blocking a trip's
 * deletion while it still has unresolved placeholders in it (see
 * design discussion) - the badge is the whole mechanism for now; a
 * blocking gate is easy to add later if the badge alone turns out not
 * to be enough in practice. */
export function GroceryListPage() {
  const entriesQuery = useGroceryEntries();
  const tripsQuery = useTrips();
  const storesQuery = useGroceryStores();
  const createPlaceholder = useCreatePlaceholderGroceryEntry();
  const updateEntry = useUpdateGroceryEntry();
  const deleteEntry = useDeleteGroceryEntry();
  const createTrip = useCreateTrip();
  const deleteTrip = useDeleteTrip();

  const [draggedEntryId, setDraggedEntryId] = useState<number | null>(null);
  const [newTripDate, setNewTripDate] = useState(() => toIsoDate(new Date()));
  const [newTripLabel, setNewTripLabel] = useState("");
  const [newTripStoreId, setNewTripStoreId] = useState<string>(ANY_STORE);
  const [dropError, setDropError] = useState<string | null>(null);
  const [newPlaceholderName, setNewPlaceholderName] = useState("");

  if (entriesQuery.isLoading || tripsQuery.isLoading) {
    return <div className="p-8 text-center text-gray-400 dark:text-gray-500">Loading...</div>;
  }

  const entries = entriesQuery.data ?? [];
  const trips = tripsQuery.data ?? [];

  const poolEntries = entries.filter((e) => e.trip_id == null);
  const poolByStore = new Map<string, { name: string; entries: GroceryListEntry[] }>();
  for (const entry of poolEntries) {
    if (entry.grocery_stores.length === 0) {
      const bucket = poolByStore.get(ANY_STORE) ?? { name: "Any store", entries: [] };
      bucket.entries.push(entry);
      poolByStore.set(ANY_STORE, bucket);
    } else {
      for (const store of entry.grocery_stores) {
        const key = String(store.id);
        const bucket = poolByStore.get(key) ?? { name: store.name, entries: [] };
        bucket.entries.push(entry);
        poolByStore.set(key, bucket);
      }
    }
  }

  function handleDragStart(e: React.DragEvent, entry: GroceryListEntry) {
    setDraggedEntryId(entry.id);
    e.dataTransfer.setData("text/plain", String(entry.id));
  }

  function handleDrop(e: React.DragEvent, tripId: number | null, tripStoreId: number | null) {
    e.preventDefault();
    setDropError(null);
    const entryId = draggedEntryId ?? Number(e.dataTransfer.getData("text/plain"));
    if (!entryId) return;
    const entry = entries.find((en) => en.id === entryId);
    if (tripId != null && entry && !isCompatible(entry, tripStoreId)) {
      setDropError(`"${entry.item_name}" isn't carried by this trip's store.`);
      setDraggedEntryId(null);
      return;
    }
    updateEntry.mutate({ entryId, tripId });
    setDraggedEntryId(null);
  }

  function handleCreateTrip() {
    if (!newTripDate) return;
    createTrip.mutate(
      {
        date: newTripDate,
        label: newTripLabel.trim() || null,
        store_id: newTripStoreId === ANY_STORE ? null : Number(newTripStoreId),
      },
      { onSuccess: () => setNewTripLabel("") },
    );
  }

  function handleAddPlaceholder() {
    if (!newPlaceholderName.trim()) return;
    createPlaceholder.mutate(newPlaceholderName.trim(), { onSuccess: () => setNewPlaceholderName("") });
  }

  const cardClass = "bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3";
  const inputClass = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm mb-2";

  return (
    <div className="max-w-[2000px] mx-auto p-4">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Grocery List</h1>
      {dropError && (
        <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          {dropError}
        </div>
      )}

      <div className="grid grid-cols-[280px_1fr] gap-4 items-start">
        {/* Pool - grouped by store */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null, null)}
          className={`${cardClass} min-h-[200px]`}
        >
          <h2 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Not yet planned</h2>
          {poolByStore.size === 0 && <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Nothing here</div>}
          {Array.from(poolByStore.entries()).map(([key, bucket]) => (
            <div key={key} className="mb-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{bucket.name}</div>
              {bucket.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onDragStart={handleDragStart}
                  onDelete={(e) => deleteEntry.mutate(e.id)}
                />
              ))}
            </div>
          ))}

          <div className="flex gap-1 mt-2">
            <input
              value={newPlaceholderName}
              onChange={(e) => setNewPlaceholderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlaceholder()}
              placeholder="No product yet? Add a name"
              className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-xs"
            />
            <button
              onClick={handleAddPlaceholder}
              disabled={createPlaceholder.isPending || !newPlaceholderName.trim()}
              className="px-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>

        {/* Trips */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {trips.map((trip) => {
            const tripEntries = entries.filter((e) => e.trip_id === trip.id);

            return (
              <div
                key={trip.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, trip.id, trip.store_id)}
                className={`${cardClass} min-w-[220px] flex-1`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{trip.label || trip.date}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {trip.label && `${trip.date} - `}
                      {trip.store?.name ?? "Any store"}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTrip.mutate(trip.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 text-sm px-1"
                    aria-label="Delete trip"
                  >
                    &times;
                  </button>
                </div>

                {tripEntries.length === 0 && <div className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">Drag items here</div>}
                {tripEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onDragStart={handleDragStart}
                    onDelete={(e) => deleteEntry.mutate(e.id)}
                  />
                ))}
              </div>
            );
          })}

          <div className={`${cardClass} min-w-[220px]`}>
            <h2 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">New trip</h2>
            <input
              type="date"
              value={newTripDate}
              onChange={(e) => setNewTripDate(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              value={newTripLabel}
              onChange={(e) => setNewTripLabel(e.target.value)}
              placeholder="Label (optional)"
              className={inputClass}
            />
            <select value={newTripStoreId} onChange={(e) => setNewTripStoreId(e.target.value)} className={inputClass}>
              <option value={ANY_STORE}>Any store</option>
              {(storesQuery.data ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateTrip}
              disabled={createTrip.isPending}
              className="w-full bg-blue-500 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-blue-600 disabled:opacity-40"
            >
              {createTrip.isPending ? "Creating..." : "Add trip"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}