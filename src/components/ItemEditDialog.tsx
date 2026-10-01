import { useEffect, useRef, useState } from "react";
import type { ItemDetail, ItemType } from "@/api/types";
import type { ItemFormPrefill } from "@/lib/itemPrefill";
import {
  useCreateGroceryStore,
  useCreateItem,
  useCreateServingSize,
  useDeleteServingSize,
  useGroceryStores,
  useItemDetail,
  useScanBarcode,
  useScanLabel,
  useUpdateItem,
  useUploadItemPhoto,
} from "@/api/hooks";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { usePasteImage } from "@/lib/usePasteImage";
import { cleanDecimalString } from "@/lib/format";

interface ItemEditDialogProps {
  itemId: number | null;
  onClose: () => void;
  /** Starts a NEW item's form pre-filled (currently: from a USDA
   * search result) instead of blank. Ignored when editing an existing
   * item. */
  prefill?: ItemFormPrefill;
  /** Called with the created item instead of the default behavior of
   * staying open in "Edit item" mode - lets a caller that opened this
   * from the middle of another flow (add-to-meal, add-as-ingredient)
   * carry straight on with the new item. The caller is responsible
   * for closing the dialog. */
  onCreated?: (item: ItemDetail) => void;
  /** Renders above another open dialog instead of alongside it. */
  stacked?: boolean;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const inputClass =
  "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm";
const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1";

export function ItemEditDialog({ itemId, onClose, prefill, onCreated, stacked }: ItemEditDialogProps) {
  useEscapeToClose(onClose);
  const isCreating = itemId == null;

  const itemDetailQuery = useItemDetail(itemId);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const createServingSize = useCreateServingSize();
  const deleteServingSize = useDeleteServingSize();
  const groceryStoresQuery = useGroceryStores();
  const createGroceryStore = useCreateGroceryStore();
  const scanBarcode = useScanBarcode();
  const scanLabel = useScanLabel();
  const uploadPhoto = useUploadItemPhoto();
  const barcodeFileInputRef = useRef<HTMLInputElement>(null);
  const labelFileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [matchedExistingItem, setMatchedExistingItem] = useState<string | null>(null);
  const [labelConfidenceNote, setLabelConfidenceNote] = useState<string | null>(null);

  const [createdItemId, setCreatedItemId] = useState<number | null>(null);
  const effectiveItemId = createdItemId ?? itemId;

  const [name, setName] = useState(prefill?.name ?? "");
  const [brand, setBrand] = useState(prefill?.brand ?? "");
  const [barcode, setBarcode] = useState("");
  const [type, setType] = useState<ItemType>(prefill?.type ?? "product");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [kcal100g, setKcal100g] = useState(prefill?.kcal100g ?? "");
  const [protein100g, setProtein100g] = useState(prefill?.protein100g ?? "");
  const [carbs100g, setCarbs100g] = useState(prefill?.carbs100g ?? "");
  const [fat100g, setFat100g] = useState(prefill?.fat100g ?? "");
  const [fiber100g, setFiber100g] = useState(prefill?.fiber100g ?? "");
  const [sugar100g, setSugar100g] = useState(prefill?.sugar100g ?? "");
  const [saturatedFat100g, setSaturatedFat100g] = useState(prefill?.saturatedFat100g ?? "");
  const [sodiumMg100g, setSodiumMg100g] = useState(prefill?.sodiumMg100g ?? "");
  const [countsAsAddedSugar, setCountsAsAddedSugar] = useState(false);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<number>>(new Set());
  const [newStoreName, setNewStoreName] = useState("");
  const [newServingName, setNewServingName] = useState("");
  const [newServingWeightG, setNewServingWeightG] = useState("");

  useEffect(() => {
    const item = itemDetailQuery.data;
    if (!item) return;
    setName(item.name);
    setBrand(item.brand ?? "");
    setBarcode(item.barcode ?? "");
    setType(item.type);
    setImagePath(item.image_path);
    setKcal100g(cleanDecimalString(item.kcal_100g));
    setProtein100g(cleanDecimalString(item.protein_100g));
    setCarbs100g(cleanDecimalString(item.carbs_100g));
    setFat100g(cleanDecimalString(item.fat_100g));
    setFiber100g(cleanDecimalString(item.fiber_100g));
    setSugar100g(cleanDecimalString(item.sugar_100g));
    setSaturatedFat100g(cleanDecimalString(item.saturated_fat_100g));
    setSodiumMg100g(cleanDecimalString(item.sodium_mg_100g));
    setCountsAsAddedSugar(item.counts_as_added_sugar ?? false);
    setSelectedStoreIds(new Set(item.grocery_stores.map((s) => s.id)));
  }, [itemDetailQuery.data]);

  function buildPayload() {
    return {
      name,
      brand: brand.trim() || null,
      barcode: barcode.trim() || null,
      type,
      image_path: imagePath,
      kcal_100g: parseOptionalNumber(kcal100g),
      protein_100g: parseOptionalNumber(protein100g),
      carbs_100g: parseOptionalNumber(carbs100g),
      fat_100g: parseOptionalNumber(fat100g),
      fiber_100g: parseOptionalNumber(fiber100g),
      sugar_100g: parseOptionalNumber(sugar100g),
      saturated_fat_100g: parseOptionalNumber(saturatedFat100g),
      sodium_mg_100g: parseOptionalNumber(sodiumMg100g),
      counts_as_added_sugar: countsAsAddedSugar,
      grocery_store_ids: Array.from(selectedStoreIds),
    };
  }

  function handleSave() {
    if (!name.trim()) return;
    if (isCreating && createdItemId == null) {
      createItem.mutate(
        { ...buildPayload(), ...(prefill?.origin ? { origin: prefill.origin } : {}) },
        {
          onSuccess: (created) => {
            if (onCreated) onCreated(created);
            else setCreatedItemId(created.item_id);
          },
        },
      );
    } else if (effectiveItemId != null) {
      updateItem.mutate({ itemId: effectiveItemId, payload: buildPayload() }, { onSuccess: onClose });
    }
  }

  function handleAddStore() {
    if (!newStoreName.trim()) return;
    createGroceryStore.mutate(newStoreName.trim(), {
      onSuccess: (store) => {
        setSelectedStoreIds((prev) => new Set(prev).add(store.id));
        setNewStoreName("");
      },
    });
  }

  function handleAddServing() {
    if (!newServingName.trim() || effectiveItemId == null) return;
    const weightG = parseFloat(newServingWeightG);
    if (!Number.isFinite(weightG) || weightG <= 0) return;
    createServingSize.mutate(
      { itemId: effectiveItemId, name: newServingName.trim(), weightG },
      { onSuccess: () => { setNewServingName(""); setNewServingWeightG(""); } },
    );
  }

  function handleDeleteServing(servingId: number) {
    if (effectiveItemId == null) return;
    deleteServingSize.mutate({ itemId: effectiveItemId, servingId });
  }

  function uploadPhotoFile(file: File) {
    uploadPhoto.mutate(file, {
      onSuccess: (result) => setImagePath(result.image_path),
    });
  }

  function handlePhotoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadPhotoFile(file);
  }

  const handlePastePhoto = usePasteImage(uploadPhotoFile);

  function handleBarcodeFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;
    setMatchedExistingItem(null);
    scanBarcode.mutate(file, {
      onSuccess: (result) => {
        if (result.barcode) setBarcode(result.barcode);
        // Just an informational note - this dialog doesn't auto-switch
        // to editing the matched item instead, since the person might
        // genuinely be creating a related-but-different item (a
        // different size/variant) that happens to share a scan result.
        if (result.item) setMatchedExistingItem(result.item.name);
      },
    });
  }

  function handleLabelFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLabelConfidenceNote(null);
    scanLabel.mutate(file, {
      onSuccess: (result) => {
        // Only overwrite fields OCR actually found something for -
        // never blanks out a field the person already filled in
        // themselves just because this particular label photo didn't
        // pick that value up.
        if (result.macros.kcal_100g != null) setKcal100g(result.macros.kcal_100g);
        if (result.macros.protein_100g != null) setProtein100g(result.macros.protein_100g);
        if (result.macros.carbs_100g != null) setCarbs100g(result.macros.carbs_100g);
        if (result.macros.fat_100g != null) setFat100g(result.macros.fat_100g);
        if (result.macros.fiber_100g != null) setFiber100g(result.macros.fiber_100g);
        if (result.macros.sugar_100g != null) setSugar100g(result.macros.sugar_100g);
        if (result.macros.saturated_fat_100g != null) setSaturatedFat100g(result.macros.saturated_fat_100g);
        if (result.macros.sodium_mg_100g != null) setSodiumMg100g(result.macros.sodium_mg_100g);
        if (!result.per_100g_confirmed) {
          setLabelConfidenceNote("Couldn't confirm these are per-100g values (vs. per-serving) - please double check.");
        }
      },
    });
  }

  const saveError = createItem.isError
    ? (createItem.error as Error).message
    : updateItem.isError
      ? (updateItem.error as Error).message
      : null;
  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <>
      <div className={`fixed inset-0 bg-black/30 ${stacked ? "z-[60]" : "z-40"}`} onClick={onClose} />
      <div className={`fixed inset-0 ${stacked ? "z-[70]" : "z-50"} flex items-start justify-center pt-10 p-4 pointer-events-none`}>
        <div
          onPaste={handlePastePhoto}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh] pointer-events-auto"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {isCreating && createdItemId == null ? "New item" : "Edit item"}
            </h2>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isCreating && prefill?.origin === "usda_import" && (
              <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                Imported from USDA FoodData Central - please review the name and values before saving. A blank
                field means USDA didn't report it.
              </div>
            )}
            <div className="flex items-center gap-3">
              {imagePath ? (
                <img src={`/${imagePath}`} alt="" className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
              )}
              <button
                onClick={() => photoFileInputRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                {uploadPhoto.isPending ? "Uploading..." : imagePath ? "Change photo" : "Add photo"}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">or paste (Ctrl+V)</span>
              <input ref={photoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileSelected} />
            </div>
            {uploadPhoto.isError && <div className="text-xs text-red-500">{(uploadPhoto.error as Error).message}</div>}

            <div>
              <label className={labelClass}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Barcode</label>
              <div className="flex gap-2">
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={`flex-1 ${inputClass}`} />
                <button
                  onClick={() => barcodeFileInputRef.current?.click()}
                  disabled={scanBarcode.isPending}
                  className="px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 whitespace-nowrap"
                >
                  {scanBarcode.isPending ? "Scanning..." : "Scan photo"}
                </button>
                <input ref={barcodeFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBarcodeFileSelected} />
              </div>
              {scanBarcode.isError && (
                <div className="text-xs text-red-500 mt-1">{(scanBarcode.error as Error).message}</div>
              )}
              {scanBarcode.data && !scanBarcode.data.barcode && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Couldn't read a barcode from that photo.</div>
              )}
              {matchedExistingItem && (
                <div className="text-xs text-amber-600 mt-1">
                  This barcode matches an existing item: {matchedExistingItem}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <div className="flex gap-2">
                {(["product", "ingredient"] as ItemType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm capitalize border ${
                      type === t
                        ? "bg-blue-500 text-white border-blue-500"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Macros, per 100g</div>
              <button
                onClick={() => labelFileInputRef.current?.click()}
                disabled={scanLabel.isPending}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                {scanLabel.isPending ? "Scanning..." : "Scan nutrition label"}
              </button>
              <input ref={labelFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLabelFileSelected} />
            </div>
            {scanLabel.isError && <div className="text-xs text-red-500">{(scanLabel.error as Error).message}</div>}
            {labelConfidenceNote && <div className="text-xs text-amber-600">{labelConfidenceNote}</div>}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Calories</label>
                <input type="number" step="any" value={kcal100g} onChange={(e) => setKcal100g(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Protein (g)</label>
                <input type="number" step="any" value={protein100g} onChange={(e) => setProtein100g(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Carbs (g)</label>
                <input type="number" step="any" value={carbs100g} onChange={(e) => setCarbs100g(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fat (g)</label>
                <input type="number" step="any" value={fat100g} onChange={(e) => setFat100g(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fiber (g)</label>
                <input type="number" step="any" value={fiber100g} onChange={(e) => setFiber100g(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sugar (g)</label>
                <input type="number" step="any" value={sugar100g} onChange={(e) => setSugar100g(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Saturated fat (g)</label>
                <input type="number" step="any" value={saturatedFat100g} onChange={(e) => setSaturatedFat100g(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sodium (mg)</label>
                <input type="number" step="any" value={sodiumMg100g} onChange={(e) => setSodiumMg100g(e.target.value)} className={inputClass} />
              </div>
            </div>

            <button
              onClick={() => setCountsAsAddedSugar((v) => !v)}
              className="w-full flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700 mt-1"
            >
              <span className="text-sm text-gray-700 dark:text-gray-200">Counts as added sugar</span>
              <span className="text-sm font-medium text-blue-600">{countsAsAddedSugar ? "Yes" : "No"}</span>
            </button>

            {effectiveItemId != null && (
              <>
                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-2">Serving sizes</div>
                {(itemDetailQuery.data?.serving_sizes ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-700 dark:text-gray-200">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 dark:text-gray-500">{s.weight_g}g</span>
                      <button
                        onClick={() => handleDeleteServing(s.id)}
                        disabled={deleteServingSize.isPending}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 px-1 disabled:opacity-40"
                        aria-label="Delete serving"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
                {deleteServingSize.isError && (
                  <div className="text-xs text-red-500">{(deleteServingSize.error as Error).message}</div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newServingName}
                    onChange={(e) => setNewServingName(e.target.value)}
                    placeholder="e.g. 1 slice"
                    className={`flex-1 ${inputClass}`}
                  />
                  <input
                    type="number"
                    step="any"
                    value={newServingWeightG}
                    onChange={(e) => setNewServingWeightG(e.target.value)}
                    placeholder="Grams"
                    className={`w-24 ${inputClass}`}
                  />
                  <button
                    onClick={handleAddServing}
                    disabled={createServingSize.isPending}
                    className="px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </>
            )}

            <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-2">Grocery stores</div>
            <div className="space-y-1">
              {(groceryStoresQuery.data ?? []).map((store) => (
                <label key={store.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedStoreIds.has(store.id)}
                    onChange={(e) => {
                      setSelectedStoreIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(store.id);
                        else next.delete(store.id);
                        return next;
                      });
                    }}
                  />
                  {store.name}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="New store name"
                className={`flex-1 ${inputClass}`}
              />
              <button
                onClick={handleAddStore}
                disabled={createGroceryStore.isPending}
                className="px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            {saveError && <div className="text-xs text-red-500 mb-2">{saveError}</div>}
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-600"
            >
              {isSaving ? "Saving..." : isCreating && createdItemId == null ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}