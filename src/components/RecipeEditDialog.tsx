import { useEffect, useRef, useState } from "react";
import type { RecipeIngredientDetail, RecipeStep, RecipeType } from "@/api/types";
import { servingQuantityLabel } from "@/lib/macros";
import {
  useAddRecipeIngredient,
  useAddRecipeStep,
  useCreateRecipe,
  useDeleteRecipe,
  useDeleteRecipeIngredient,
  useDeleteRecipeStep,
  useItemSearch,
  useRecipeDetail,
  useUpdateRecipe,
  useUpdateRecipeIngredient,
  useUpdateRecipeStep,
  useUploadItemPhoto,
} from "@/api/hooks";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { ServingPicker } from "./ServingPicker";

interface RecipeEditDialogProps {
  recipeId: number | null;
  onClose: () => void;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function IngredientRow({ recipeId, ingredient }: { recipeId: number; ingredient: RecipeIngredientDetail }) {
  const updateIngredient = useUpdateRecipeIngredient();
  const deleteIngredient = useDeleteRecipeIngredient();
  const [quantityInput, setQuantityInput] = useState(ingredient.quantity);
  const [servingSizeId, setServingSizeId] = useState<number | null>(ingredient.serving_size_id);

  const changed = quantityInput !== ingredient.quantity || servingSizeId !== ingredient.serving_size_id;

  function handleSave() {
    const quantity = parseFloat(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    updateIngredient.mutate({ recipeId, itemId: ingredient.item_id, servingSizeId, quantity });
  }

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-2 mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-800 dark:text-gray-100">
          {ingredient.item_name}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            {servingQuantityLabel(ingredient.quantity, ingredient.serving_size_name, ingredient.serving_size_weight_g)}
          </span>
        </span>
        <button
          onClick={() => deleteIngredient.mutate({ recipeId, itemId: ingredient.item_id })}
          className="text-gray-400 dark:text-gray-500 hover:text-red-500 text-sm px-1"
          aria-label="Remove ingredient"
        >
          &times;
        </button>
      </div>
      <ServingPicker itemId={ingredient.item_id} selectedServingSizeId={servingSizeId} onSelect={setServingSizeId} />
      <div className="flex gap-2 mt-1">
        <input
          type="number"
          step="any"
          min="0"
          value={quantityInput}
          onChange={(e) => setQuantityInput(e.target.value)}
          className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm"
        />
        <button
          onClick={handleSave}
          disabled={!changed || updateIngredient.isPending}
          className="px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {updateIngredient.isPending ? "..." : "Save"}
        </button>
      </div>
      {(updateIngredient.isError || deleteIngredient.isError) && (
        <div className="text-xs text-red-500 mt-1">
          {((updateIngredient.error ?? deleteIngredient.error) as Error).message}
        </div>
      )}
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
          <button onClick={() => setSelected(null)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
            &larr; Back
          </button>
        </div>
        <ServingPicker itemId={selected.id} selectedServingSizeId={servingSizeId} onSelect={setServingSizeId} />
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            step="any"
            min="0"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm"
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

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items to add..."
        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-1"
      />
      {debouncedQuery.trim().length > 0 &&
        (itemsQuery.data ?? []).map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected({ id: item.id, name: item.name })}
            className="w-full text-left text-sm py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1"
          >
            {item.name}
          </button>
        ))}
    </div>
  );
}

function StepRow({ recipeId, step }: { recipeId: number; step: RecipeStep }) {
  const updateStep = useUpdateRecipeStep();
  const deleteStep = useDeleteRecipeStep();
  const [textInput, setTextInput] = useState(step.text);
  const [timerInput, setTimerInput] = useState(step.timer_seconds != null ? String(step.timer_seconds) : "");

  const changed = textInput !== step.text || timerInput !== (step.timer_seconds != null ? String(step.timer_seconds) : "");

  function handleSave() {
    const timerSeconds = timerInput.trim() === "" ? null : parseInt(timerInput, 10);
    updateStep.mutate({ recipeId, stepId: step.id, text: textInput, timerSeconds: Number.isFinite(timerSeconds) ? timerSeconds : null });
  }

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-2 mb-2">
      <div className="flex items-start gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 pt-2 shrink-0">{step.step_number}.</span>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          rows={2}
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-sm resize-none"
        />
        <button
          onClick={() => deleteStep.mutate({ recipeId, stepId: step.id })}
          disabled={deleteStep.isPending}
          className="text-gray-300 dark:text-gray-600 hover:text-red-500 px-1 shrink-0 disabled:opacity-40"
          aria-label="Delete step"
        >
          &times;
        </button>
      </div>
      <div className="flex items-center gap-2 pl-5">
        <input
          type="number"
          min="0"
          value={timerInput}
          onChange={(e) => setTimerInput(e.target.value)}
          placeholder="Timer (seconds, optional)"
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-xs"
        />
        <button
          onClick={handleSave}
          disabled={!changed || updateStep.isPending}
          className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
        >
          {updateStep.isPending ? "..." : "Save"}
        </button>
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
  const [timerInput, setTimerInput] = useState("");

  function handleAdd() {
    if (!text.trim()) return;
    const timerSeconds = timerInput.trim() === "" ? null : parseInt(timerInput, 10);
    addStep.mutate(
      { recipeId, text: text.trim(), timerSeconds: Number.isFinite(timerSeconds) ? timerSeconds : null },
      { onSuccess: () => { setText(""); setTimerInput(""); } },
    );
  }

  return (
    <div className="border border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Next step..."
        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-sm resize-none mb-2"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={timerInput}
          onChange={(e) => setTimerInput(e.target.value)}
          placeholder="Timer (seconds, optional)"
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-xs"
        />
        <button
          onClick={handleAdd}
          disabled={addStep.isPending || !text.trim()}
          className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-600 disabled:opacity-40"
        >
          {addStep.isPending ? "Adding..." : "Add step"}
        </button>
      </div>
      {addStep.isError && <div className="text-xs text-red-500 mt-1">{(addStep.error as Error).message}</div>}
    </div>
  );
}

/** Ingredients can only be managed once the recipe actually exists
 * (same "must be saved first" pattern as an item's serving sizes) -
 * even though POST /recipes can technically accept ingredients bundled
 * into the initial create call, always creating with an empty list and
 * adding them afterward via their own endpoints avoids needing two
 * different code paths (accumulate-locally-then-bundle vs. call-the-
 * real-endpoint) depending on whether the recipe exists yet.
 *
 * instructions and image upload are deliberately NOT in this dialog -
 * see design discussion: instructions needs its own dedicated design
 * pass, and photo upload is a separate piece of work. */
export function RecipeEditDialog({ recipeId, onClose }: RecipeEditDialogProps) {
  useEscapeToClose(onClose);
  const isCreating = recipeId == null;

  const [createdRecipeId, setCreatedRecipeId] = useState<number | null>(null);
  const effectiveRecipeId = createdRecipeId ?? recipeId;

  const recipeDetailQuery = useRecipeDetail(effectiveRecipeId);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  // Same generic file-save endpoint items use (see design discussion -
  // it never actually touches an item's own DB row, it just saves a
  // file and returns its path, so it's genuinely reusable for a
  // recipe's photo too despite living under an /items/ URL).
  const uploadPhoto = useUploadItemPhoto();
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [recipeType, setRecipeType] = useState<RecipeType>("recipe");
  const [servings, setServings] = useState("1");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const r = recipeDetailQuery.data;
    if (!r) return;
    setName(r.name);
    setRecipeType(r.recipe_type);
    setServings(r.servings);
    setSourceUrl(r.source_url ?? "");
    setImagePath(r.image_path);
  }, [recipeDetailQuery.data]);

  function buildMetadataPayload() {
    const servingsNum = parseFloat(servings);
    return {
      name,
      recipe_type: recipeType,
      servings: Number.isFinite(servingsNum) && servingsNum > 0 ? servingsNum : 1,
      source_url: sourceUrl.trim() || null,
      image_path: imagePath,
    };
  }

  function handlePhotoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadPhoto.mutate(file, {
      onSuccess: (result) => setImagePath(result.image_path),
    });
  }

  function handleSave() {
    if (!name.trim()) return;
    if (isCreating && createdRecipeId == null) {
      createRecipe.mutate(buildMetadataPayload(), {
        onSuccess: (created) => setCreatedRecipeId(created.recipe_id),
      });
    } else if (effectiveRecipeId != null) {
      updateRecipe.mutate({ recipeId: effectiveRecipeId, payload: buildMetadataPayload() }, { onSuccess: onClose });
    }
  }

  function handleDelete() {
    if (!effectiveRecipeId) return;
    deleteRecipe.mutate(effectiveRecipeId, { onSuccess: onClose });
  }

  const saveError = createRecipe.isError
    ? (createRecipe.error as Error).message
    : updateRecipe.isError
      ? (updateRecipe.error as Error).message
      : null;
  const isSaving = createRecipe.isPending || updateRecipe.isPending;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh] pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {isCreating && createdRecipeId == null ? "New recipe" : "Edit recipe"}
            </h2>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              <input ref={photoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileSelected} />
            </div>
            {uploadPhoto.isError && <div className="text-xs text-red-500">{(uploadPhoto.error as Error).message}</div>}

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <div className="flex gap-2">
                {(["recipe", "meal"] as RecipeType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRecipeType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm capitalize border ${
                      recipeType === t ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Servings</label>
                <input type="number" step="any" min="0" value={servings} onChange={(e) => setServings(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source URL</label>
                <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {effectiveRecipeId != null && (
              <>
                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-2">Ingredients</div>
                {(recipeDetailQuery.data?.ingredients ?? []).map((ing) => (
                  <IngredientRow key={ing.item_id} recipeId={effectiveRecipeId} ingredient={ing} />
                ))}
                <AddIngredientForm recipeId={effectiveRecipeId} />

                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-2">Steps</div>
                {(recipeDetailQuery.data?.steps ?? []).map((step) => (
                  <StepRow key={step.id} recipeId={effectiveRecipeId} step={step} />
                ))}
                <AddStepForm recipeId={effectiveRecipeId} />
              </>
            )}

            {!isCreating && (
              <div className="pt-2">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full text-red-500 text-sm py-2 rounded-lg border border-red-200 hover:bg-red-50"
                  >
                    Delete this recipe
                  </button>
                ) : (
                  <div className="border border-red-200 rounded-lg p-2">
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Delete this recipe? This can't be undone.</div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 text-sm py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
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
                    {deleteRecipe.isError && <div className="text-xs text-red-500 mt-1">{(deleteRecipe.error as Error).message}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            {saveError && <div className="text-xs text-red-500 mb-2">{saveError}</div>}
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-600"
            >
              {isSaving ? "Saving..." : isCreating && createdRecipeId == null ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}