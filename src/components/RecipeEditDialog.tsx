import { useEffect, useRef, useState } from "react";
import type { RecipeComponentDetail, RecipeIngredientDetail, RecipeStep, RecipeType } from "@/api/types";
import { servingQuantityLabel } from "@/lib/macros";
import { cleanDecimalString } from "@/lib/format";
import { MACRO_COLORS } from "@/lib/colors";
import {
  useAddRecipeIngredient,
  useAddRecipeStep,
  useCreateGroceryEntry,
  useCreateRecipe,
  useDeleteRecipe,
  useDeleteRecipeComponent,
  useDeleteRecipeIngredient,
  useUpdateRecipeComponent,
  useDeleteRecipeStep,
  useItemSearch,
  useRecipeDetail,
  useUpdateRecipe,
  useUpdateRecipeIngredient,
  useUpdateRecipeStep,
  useUploadItemPhoto,
} from "@/api/hooks";
import { usdaFoodToPrefill, type ItemFormPrefill } from "@/lib/itemPrefill";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { usePasteImage } from "@/lib/usePasteImage";
import { CheckIcon, PlusIcon, TrashIcon } from "./icons";
import { DialogShell, type DialogSection } from "./DialogShell";
import { ItemEditDialog } from "./ItemEditDialog";
import { ServingPicker } from "./ServingPicker";
import { TimerSelect } from "./TimerSelect";
import { UsdaSearchPanel } from "./UsdaSearchPanel";

interface RecipeEditDialogProps {
  recipeId: number | null;
  onClose: () => void;
  /** Renders above another open dialog instead of alongside it - same
   * pattern as ItemEditDialog's own stacked prop. */
  stacked?: boolean;
}

type SectionId = "ingredients" | "steps" | "full" | "details";

interface MetaValues {
  name: string;
  recipeType: RecipeType;
  servings: string;
  sourceUrl: string;
  imagePath: string | null;
  fullIngredients: string;
}

function parseServings(servings: string): number | null {
  const parsed = parseFloat(servings);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function metaPayload(v: MetaValues) {
  return {
    name: v.name,
    recipe_type: v.recipeType,
    servings: parseServings(v.servings) ?? 1,
    source_url: v.sourceUrl.trim() || null,
    image_path: v.imagePath,
    full_ingredients: v.fullIngredients.trim() || null,
  };
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const smallInputClass =
  "border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm";
const subtleButtonClass =
  "px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40";

function MacroLine({
  kcal,
  protein,
  fat,
  carbs,
  fiber,
}: {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}) {
  return (
    <span className="space-x-1.5 text-xs">
      <span className="text-gray-500 dark:text-gray-300">{kcal} Cal</span>
      <span style={{ color: MACRO_COLORS.protein }}>{protein}P</span>
      <span style={{ color: MACRO_COLORS.fat }}>{fat}F</span>
      <span style={{ color: MACRO_COLORS.carbs }}>{carbs}C</span>
      <span style={{ color: MACRO_COLORS.fiber }}>{fiber}Fi</span>
    </span>
  );
}

function Thumb({ imagePath }: { imagePath: string | null }) {
  return imagePath ? (
    <img src={`/${imagePath}`} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 shrink-0" />
  );
}

/** One ingredient, laid out like a row on the week view: image, name,
 * clickable quantity (opens the inline editor), macros, and hover
 * actions (add to grocery list, remove). Clicking the name opens the
 * item itself. */
function IngredientRow({
  recipeId,
  ingredient,
  onOpenItem,
}: {
  recipeId: number;
  ingredient: RecipeIngredientDetail;
  onOpenItem: (itemId: number) => void;
}) {
  const updateIngredient = useUpdateRecipeIngredient();
  const deleteIngredient = useDeleteRecipeIngredient();
  const addToGroceryList = useCreateGroceryEntry();
  const [editing, setEditing] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [quantityInput, setQuantityInput] = useState(cleanDecimalString(ingredient.quantity));
  const [servingSizeId, setServingSizeId] = useState<number | null>(ingredient.serving_size_id);

  const changed =
    quantityInput !== cleanDecimalString(ingredient.quantity) || servingSizeId !== ingredient.serving_size_id;

  function openEditor() {
    setQuantityInput(cleanDecimalString(ingredient.quantity));
    setServingSizeId(ingredient.serving_size_id);
    setEditing(true);
  }

  function handleSave() {
    const quantity = parseFloat(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    updateIngredient.mutate(
      { recipeId, itemId: ingredient.item_id, servingSizeId, quantity },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleAddToGroceryList() {
    addToGroceryList.mutate(ingredient.item_id, {
      onSuccess: () => {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      },
    });
  }

  const error = updateIngredient.error ?? deleteIngredient.error ?? addToGroceryList.error;

  return (
    <div className="group relative rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/60">
      <div className="flex items-center gap-2 pr-14">
        <Thumb imagePath={ingredient.image_path} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <button
              onClick={() => onOpenItem(ingredient.item_id)}
              className="text-sm text-gray-800 dark:text-gray-100 truncate text-left hover:underline"
            >
              {ingredient.item_name}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-300 shrink-0">{ingredient.kcal} Cal</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <button
              onClick={() => (editing ? setEditing(false) : openEditor())}
              className="text-xs text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
            >
              {servingQuantityLabel(ingredient.quantity, ingredient.serving_size_name, ingredient.serving_size_weight_g)}
            </button>
            <MacroLine
              kcal={ingredient.kcal}
              protein={ingredient.protein_g}
              fat={ingredient.fat_g}
              carbs={ingredient.carbs_g}
              fiber={ingredient.fiber_g}
            />
          </div>
        </div>
      </div>

      <div className="absolute right-1 top-1.5 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <button
          onClick={handleAddToGroceryList}
          disabled={addToGroceryList.isPending}
          aria-label="Add to grocery list"
          title="Add to grocery list"
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300"
        >
          {justAdded ? <CheckIcon className="w-4 h-4 text-green-500" /> : <PlusIcon />}
        </button>
        <button
          onClick={() => deleteIngredient.mutate({ recipeId, itemId: ingredient.item_id })}
          disabled={deleteIngredient.isPending}
          aria-label="Remove ingredient"
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
        >
          <TrashIcon />
        </button>
      </div>

      {editing && (
        <div className="mt-2 ml-10 space-y-2">
          <ServingPicker
            itemId={ingredient.item_id}
            selectedServingSizeId={servingSizeId}
            onSelect={(id, convertQuantity) => {
              setServingSizeId(id);
              setQuantityInput(convertQuantity);
            }}
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              min="0"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && changed && handleSave()}
              className={`flex-1 min-w-0 ${smallInputClass}`}
            />
            <button onClick={() => setEditing(false)} className={subtleButtonClass}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!changed || updateIngredient.isPending}
              className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-40"
            >
              {updateIngredient.isPending ? "..." : "Save"}
            </button>
          </div>
        </div>
      )}
      {error && <div className="text-xs text-red-500 mt-1 ml-10">{(error as Error).message}</div>}
    </div>
  );
}

function ComponentRow({ recipeId, component }: { recipeId: number; component: RecipeComponentDetail }) {
  const updateComponent = useUpdateRecipeComponent();
  const deleteComponent = useDeleteRecipeComponent();
  const [editing, setEditing] = useState(false);
  const [quantityInput, setQuantityInput] = useState(cleanDecimalString(component.quantity));
  const changed = quantityInput !== cleanDecimalString(component.quantity);
  const servingsLabel = `${cleanDecimalString(component.quantity)} serving${parseFloat(component.quantity) === 1 ? "" : "s"}`;

  function handleSave() {
    const quantity = parseFloat(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    updateComponent.mutate(
      { recipeId, componentRecipeId: component.component_recipe_id, quantity },
      { onSuccess: () => setEditing(false) },
    );
  }

  const error = updateComponent.error ?? deleteComponent.error;

  return (
    <div className="group relative rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/60">
      <div className="flex items-center gap-2 pr-8">
        <Thumb imagePath={component.image_path} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{component.recipe_name}</span>
            <span className="text-sm text-gray-500 dark:text-gray-300 shrink-0">{component.kcal} Cal</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-xs text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
            >
              {servingsLabel}
            </button>
            <MacroLine
              kcal={component.kcal}
              protein={component.protein_g}
              fat={component.fat_g}
              carbs={component.carbs_g}
              fiber={component.fiber_g}
            />
          </div>
        </div>
      </div>
      <div className="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <button
          onClick={() => deleteComponent.mutate({ recipeId, componentRecipeId: component.component_recipe_id })}
          aria-label="Remove recipe"
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
        >
          <TrashIcon />
        </button>
      </div>
      {editing && (
        <div className="mt-2 ml-10 flex gap-2">
          <input
            type="number"
            step="any"
            min="0"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className={`flex-1 min-w-0 ${smallInputClass}`}
          />
          <button onClick={() => setEditing(false)} className={subtleButtonClass}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!changed || updateComponent.isPending}
            className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-40"
          >
            {updateComponent.isPending ? "..." : "Save"}
          </button>
        </div>
      )}
      {error && <div className="text-xs text-red-500 mt-1 ml-10">{(error as Error).message}</div>}
    </div>
  );
}

function AddIngredientForm({ recipeId }: { recipeId: number }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const itemsQuery = useItemSearch(debouncedQuery);
  const addIngredient = useAddRecipeIngredient();

  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const [quantityInput, setQuantityInput] = useState("100");
  const [servingSizeId, setServingSizeId] = useState<number | null>(null);
  // USDA fallback, same flow as the add-to-meal search: swap in a USDA
  // search, and a picked result opens the item form pre-filled for review.
  const [showUsda, setShowUsda] = useState(false);
  const [usdaPrefill, setUsdaPrefill] = useState<ItemFormPrefill | null>(null);

  function handleAdd() {
    const quantity = parseFloat(quantityInput);
    if (!selected || !Number.isFinite(quantity) || quantity <= 0) return;
    addIngredient.mutate(
      { recipeId, itemId: selected.id, servingSizeId, quantity },
      {
        onSuccess: () => {
          setSelected(null);
          setQuery("");
          setQuantityInput("100");
          setServingSizeId(null);
        },
      },
    );
  }

  if (selected) {
    return (
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-800 dark:text-gray-100">{selected.name}</span>
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-gray-400 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
          >
            &larr; Back
          </button>
        </div>
        <ServingPicker
          itemId={selected.id}
          selectedServingSizeId={servingSizeId}
          onSelect={(id, convertQuantity) => {
            setServingSizeId(id);
            setQuantityInput(convertQuantity);
          }}
        />
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            step="any"
            min="0"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className={`flex-1 min-w-0 ${smallInputClass}`}
          />
          <button
            onClick={handleAdd}
            disabled={addIngredient.isPending}
            className="px-3 rounded-lg bg-blue-500 text-white text-sm disabled:opacity-40 hover:bg-blue-600"
          >
            {addIngredient.isPending ? "..." : "Add"}
          </button>
        </div>
        {addIngredient.isError && (
          <div className="text-xs text-red-500 mt-1">{(addIngredient.error as Error).message}</div>
        )}
      </div>
    );
  }

  const hasQuery = debouncedQuery.trim().length > 0;
  const results = itemsQuery.data ?? [];

  return (
    <div>
      {showUsda ? (
        <UsdaSearchPanel
          initialQuery={query.trim()}
          onPick={(food) => setUsdaPrefill(usdaFoodToPrefill(food))}
          onBack={() => setShowUsda(false)}
        />
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items to add..."
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-1"
          />
          {hasQuery &&
            results.map((item) => (
              <button
                key={item.item_id}
                onClick={() => setSelected({ id: item.item_id, name: item.name })}
                className="w-full text-left text-sm py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1"
              >
                {item.name}
              </button>
            ))}
          {hasQuery && !itemsQuery.isFetching && results.length === 0 && (
            <div className="text-center py-3">
              <div className="text-xs text-gray-400 dark:text-gray-300 mb-2">No matches</div>
              <button
                onClick={() => setShowUsda(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-600"
              >
                Search USDA for "{query.trim()}"
              </button>
            </div>
          )}
          {hasQuery && results.length > 0 && (
            <button
              onClick={() => setShowUsda(true)}
              className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline py-2"
            >
              Not finding it? Search USDA
            </button>
          )}
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
            setShowUsda(false);
            setSelected({ id: created.item_id, name: created.name });
            setQuantityInput("100");
            setServingSizeId(null);
          }}
        />
      )}
    </div>
  );
}

/** Text saves when the field loses focus, timer saves as soon as it is
 * picked - no per-step Save button. */
function StepRow({ recipeId, step }: { recipeId: number; step: RecipeStep }) {
  const updateStep = useUpdateRecipeStep();
  const deleteStep = useDeleteRecipeStep();
  const [textInput, setTextInput] = useState(step.text);

  function saveText() {
    const trimmed = textInput.trim();
    if (!trimmed || trimmed === step.text) return;
    updateStep.mutate({ recipeId, stepId: step.id, text: trimmed });
  }

  return (
    <div className="rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700/60">
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-300 pt-2 w-5 shrink-0">
          {step.step_number}.
        </span>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onBlur={saveText}
          rows={2}
          className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm resize-y"
        />
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={() => deleteStep.mutate({ recipeId, stepId: step.id })}
            disabled={deleteStep.isPending}
            aria-label="Delete step"
            className="p-1 rounded text-gray-400 dark:text-gray-300 hover:text-red-500 disabled:opacity-40"
          >
            <TrashIcon />
          </button>
          <TimerSelect
            value={step.timer_seconds}
            onChange={(seconds) => updateStep.mutate({ recipeId, stepId: step.id, timerSeconds: seconds })}
          />
        </div>
      </div>
      {(updateStep.isError || deleteStep.isError) && (
        <div className="text-xs text-red-500 mt-1">{((updateStep.error ?? deleteStep.error) as Error).message}</div>
      )}
    </div>
  );
}

function AddStepForm({ recipeId }: { recipeId: number }) {
  const addStep = useAddRecipeStep();
  const [text, setText] = useState("");
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);

  function handleAdd() {
    if (!text.trim()) return;
    addStep.mutate(
      { recipeId, text: text.trim(), timerSeconds },
      {
        onSuccess: () => {
          setText("");
          setTimerSeconds(null);
        },
      },
    );
  }

  return (
    <div className="border border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Next step..."
        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm resize-y mb-2"
      />
      <div className="flex items-center justify-between gap-2">
        <TimerSelect value={timerSeconds} onChange={setTimerSeconds} />
        <button
          onClick={handleAdd}
          disabled={addStep.isPending || !text.trim()}
          className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-40"
        >
          {addStep.isPending ? "Adding..." : "Add step"}
        </button>
      </div>
      {addStep.isError && <div className="text-xs text-red-500 mt-1">{(addStep.error as Error).message}</div>}
    </div>
  );
}

/** Recipe editor. Everything except ingredients/steps (which have their
 * own endpoints) autosaves a moment after you stop typing, so there is no
 * Save button to forget. A brand-new recipe is created first (name, type,
 * servings) and the full editor appears once it exists - same
 * "must exist first" rule as before, which also avoids leaving empty
 * draft recipes behind if you cancel.
 *
 * The form is filled from the server ONCE per recipe. It used to be
 * re-filled on every refetch, which silently threw away unsaved edits
 * (e.g. a changed servings count) whenever an ingredient was added. */
export function RecipeEditDialog({ recipeId, onClose, stacked }: RecipeEditDialogProps) {
  const isCreating = recipeId == null;

  const [createdRecipeId, setCreatedRecipeId] = useState<number | null>(null);
  const effectiveRecipeId = createdRecipeId ?? recipeId;

  const recipeDetailQuery = useRecipeDetail(effectiveRecipeId);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const addToGroceryList = useCreateGroceryEntry();
  const uploadPhoto = useUploadItemPhoto();
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [recipeType, setRecipeType] = useState<RecipeType>("recipe");
  const [servings, setServings] = useState("1");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [fullIngredients, setFullIngredients] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [section, setSection] = useState<SectionId>("ingredients");
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [addedAllCount, setAddedAllCount] = useState<number | null>(null);

  const seededForRef = useRef<number | null>(null);
  const savedKeyRef = useRef<string | null>(null);

  const values: MetaValues = { name, recipeType, servings, sourceUrl, imagePath, fullIngredients };
  const payloadKey = JSON.stringify(metaPayload(values));
  const servingsValid = parseServings(servings) != null;

  useEffect(() => {
    const r = recipeDetailQuery.data;
    if (!r || seededForRef.current === r.recipe_id) return;
    seededForRef.current = r.recipe_id;
    const seeded: MetaValues = {
      name: r.name,
      recipeType: r.recipe_type,
      servings: cleanDecimalString(r.servings),
      sourceUrl: r.source_url ?? "",
      imagePath: r.image_path,
      fullIngredients: r.full_ingredients ?? "",
    };
    setName(seeded.name);
    setRecipeType(seeded.recipeType);
    setServings(seeded.servings);
    setSourceUrl(seeded.sourceUrl);
    setImagePath(seeded.imagePath);
    setFullIngredients(seeded.fullIngredients);
    savedKeyRef.current = JSON.stringify(metaPayload(seeded));
  }, [recipeDetailQuery.data]);

  const isSeeded = effectiveRecipeId != null && seededForRef.current === effectiveRecipeId;
  const isDirty = isSeeded && name.trim() !== "" && servingsValid && payloadKey !== savedKeyRef.current;

  function saveNow() {
    if (!isDirty || effectiveRecipeId == null) return;
    const keyAtSave = payloadKey;
    savedKeyRef.current = keyAtSave;
    updateRecipe.mutate(
      { recipeId: effectiveRecipeId, payload: JSON.parse(keyAtSave) },
      {
        onError: () => {
          // Forget it was saved so the next edit (or closing) retries.
          if (savedKeyRef.current === keyAtSave) savedKeyRef.current = null;
        },
      },
    );
  }

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(saveNow, 700);
    return () => clearTimeout(timer);
    // saveNow closes over the same values payloadKey is derived from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey, isDirty]);

  function handleClose() {
    saveNow();
    onClose();
  }
  useEscapeToClose(handleClose);

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

  function handleCreate() {
    if (!name.trim()) return;
    createRecipe.mutate(metaPayload(values), {
      onSuccess: (created) => {
        setCreatedRecipeId(created.recipe_id);
        setSection("ingredients");
      },
    });
  }

  function handleDelete() {
    if (!effectiveRecipeId) return;
    deleteRecipe.mutate(effectiveRecipeId, { onSuccess: onClose });
  }

  async function handleAddAllToGroceryList() {
    const ingredients = recipeDetailQuery.data?.ingredients ?? [];
    let added = 0;
    for (const ing of ingredients) {
      try {
        await addToGroceryList.mutateAsync(ing.item_id);
        added += 1;
      } catch {
        // Surfaced through addToGroceryList.error below.
      }
    }
    setAddedAllCount(added);
    setTimeout(() => setAddedAllCount(null), 2500);
  }

  const detail = recipeDetailQuery.data;
  const exists = effectiveRecipeId != null;
  const ingredientCount = (detail?.ingredients.length ?? 0) + (detail?.components.length ?? 0);

  const sections: DialogSection[] = [
    { id: "ingredients", label: "Ingredients", badge: ingredientCount },
    { id: "steps", label: "Steps", badge: detail?.steps.length ?? 0 },
    { id: "full", label: "Full ingredient list" },
    { id: "details", label: "Details" },
  ];

  const servingsDivisor = parseServings(servings) ?? 1;
  const perServing = detail
    ? {
        kcal: Math.ceil(detail.totals.kcal / servingsDivisor),
        protein_g: Math.ceil(detail.totals.protein_g / servingsDivisor),
        fat_g: Math.ceil(detail.totals.fat_g / servingsDivisor),
        carbs_g: Math.ceil(detail.totals.carbs_g / servingsDivisor),
        fiber_g: Math.ceil(detail.totals.fiber_g / servingsDivisor),
      }
    : null;

  const createError = createRecipe.isError ? (createRecipe.error as Error).message : null;
  const saveError = updateRecipe.isError ? (updateRecipe.error as Error).message : null;

  const summary = (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => photoFileInputRef.current?.click()}
          disabled={uploadPhoto.isPending}
          title={imagePath ? "Change photo (or paste with Ctrl+V)" : "Add photo (or paste with Ctrl+V)"}
          className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center text-gray-400 dark:text-gray-300 hover:ring-2 hover:ring-blue-400"
        >
          {imagePath ? (
            <img src={`/${imagePath}`} alt="" className="w-full h-full object-cover" />
          ) : uploadPhoto.isPending ? (
            <span className="text-xs">...</span>
          ) : (
            <PlusIcon className="w-5 h-5" />
          )}
        </button>
        <input ref={photoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileSelected} />
        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Recipe name"
            aria-label="Name"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm font-medium"
          />
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              {(["recipe", "meal"] as RecipeType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRecipeType(t)}
                  className={`px-3 py-1 text-sm capitalize ${
                    recipeType === t
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-300 ml-auto">
              Servings
              <input
                type="number"
                step="any"
                min="0"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className={`w-20 ${smallInputClass} ${servingsValid ? "" : "border-red-400 dark:border-red-400"}`}
              />
            </label>
          </div>
        </div>
      </div>
      {uploadPhoto.isError && <div className="text-xs text-red-500">{(uploadPhoto.error as Error).message}</div>}

      {detail && perServing && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-400 dark:text-gray-300 mb-0.5">Whole recipe</div>
            <MacroLine
              kcal={detail.totals.kcal}
              protein={detail.totals.protein_g}
              fat={detail.totals.fat_g}
              carbs={detail.totals.carbs_g}
              fiber={detail.totals.fiber_g}
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 dark:text-gray-300 mb-0.5">Per serving</div>
            <MacroLine
              kcal={perServing.kcal}
              protein={perServing.protein_g}
              fat={perServing.fat_g}
              carbs={perServing.carbs_g}
              fiber={perServing.fiber_g}
            />
          </div>
        </div>
      )}
    </div>
  );

  const footer = exists ? (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs ${saveError ? "text-red-500" : "text-gray-400 dark:text-gray-300"}`}>
        {saveError ??
          (!servingsValid
            ? "Enter a servings amount above 0 to save"
            : updateRecipe.isPending
              ? "Saving..."
              : isDirty
                ? "Unsaved changes..."
                : "All changes saved")}
      </span>
      <button
        onClick={handleClose}
        className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
      >
        Done
      </button>
    </div>
  ) : (
    <>
      {createError && <div className="text-xs text-red-500 mb-2">{createError}</div>}
      <button
        onClick={handleCreate}
        disabled={createRecipe.isPending || !name.trim()}
        className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-600"
      >
        {createRecipe.isPending ? "Creating..." : "Create"}
      </button>
    </>
  );

  return (
    <>
      <DialogShell
        title={exists ? "Edit recipe" : "New recipe"}
        onClose={handleClose}
        stacked={stacked}
        size="lg"
        sections={exists ? sections : undefined}
        activeSection={section}
        onSectionChange={(id) => setSection(id as SectionId)}
        summary={summary}
        footer={footer}
        onPaste={handlePastePhoto}
      >
        {!exists && (
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Name it, pick a type and servings, then create it. Ingredients, steps and notes are added right after.
          </p>
        )}

        {exists && section === "ingredients" && effectiveRecipeId != null && (
          <>
            {(detail?.ingredients.length ?? 0) > 0 && (
              <div className="flex items-center justify-end gap-2">
                {addedAllCount != null && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Added {addedAllCount} to grocery list
                  </span>
                )}
                <button onClick={handleAddAllToGroceryList} disabled={addToGroceryList.isPending} className={subtleButtonClass}>
                  Add all to grocery list
                </button>
              </div>
            )}
            <div className="-mx-2">
              {(detail?.ingredients ?? []).map((ing) => (
                <IngredientRow key={ing.item_id} recipeId={effectiveRecipeId} ingredient={ing} onOpenItem={setOpenItemId} />
              ))}
              {(detail?.components ?? []).length > 0 && (
                <>
                  <div className="text-xs text-gray-400 dark:text-gray-300 uppercase tracking-wide px-2 pt-3 pb-1">
                    Recipes in this meal
                  </div>
                  {(detail?.components ?? []).map((comp) => (
                    <ComponentRow key={comp.component_recipe_id} recipeId={effectiveRecipeId} component={comp} />
                  ))}
                </>
              )}
              {ingredientCount === 0 && (
                <div className="text-sm text-gray-400 dark:text-gray-300 px-2 py-3">No ingredients yet.</div>
              )}
            </div>
            <AddIngredientForm recipeId={effectiveRecipeId} />
          </>
        )}

        {exists && section === "steps" && effectiveRecipeId != null && (
          <>
            <div className="-mx-2">
              {(detail?.steps ?? []).map((step) => (
                <StepRow key={step.id} recipeId={effectiveRecipeId} step={step} />
              ))}
            </div>
            <AddStepForm recipeId={effectiveRecipeId} />
          </>
        )}

        {exists && section === "full" && (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-300">
              The complete ingredient list as written, including spices and anything not tracked as an item. For
              reading only; it does not affect the macros.
            </p>
            <textarea
              value={fullIngredients}
              onChange={(e) => setFullIngredients(e.target.value)}
              placeholder="Paste the full ingredient list here..."
              className="w-full h-[calc(100%-3rem)] min-h-[16rem] border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </>
        )}

        {exists && section === "details" && (
          <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-300 mb-1">Source URL</label>
              <div className="flex gap-2">
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                />
                {/^https?:\/\//.test(sourceUrl.trim()) && (
                  <a href={sourceUrl.trim()} target="_blank" rel="noreferrer" className={`${subtleButtonClass} flex items-center`}>
                    Open
                  </a>
                )}
              </div>
            </div>

            {!isCreating && (
              <div className="pt-4">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full text-red-500 text-sm py-2 rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete this recipe
                  </button>
                ) : (
                  <div className="border border-red-200 dark:border-red-900 rounded-lg p-2">
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                      Delete this recipe? This can't be undone.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 text-sm py-1.5 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteRecipe.isPending}
                        className="flex-1 text-sm py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-40"
                      >
                        {deleteRecipe.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                    {deleteRecipe.isError && (
                      <div className="text-xs text-red-500 mt-1">{(deleteRecipe.error as Error).message}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogShell>

      {openItemId != null && <ItemEditDialog itemId={openItemId} stacked onClose={() => setOpenItemId(null)} />}
    </>
  );
}
