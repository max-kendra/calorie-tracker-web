import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  BarcodeScanResult,
  DailySummary,
  Goal,
  GroceryListEntry,
  GroceryStore,
  GroceryTrip,
  Item,
  ItemDetail,
  Log,
  MealGoalSplitInput,
  MealType,
  OcrScanResult,
  Recipe,
  RecipeDetail,
  ServingSize,
  UsdaFood,
  UserProfile,
  WeightHistoryEntry,
} from "./types";

export function useLogsRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["logs", startDate, endDate],
    queryFn: () => api.get<Log[]>(`/logs?start_date=${startDate}&end_date=${endDate}`),
  });
}

export function useDailySummaries(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["daily-summary", startDate, endDate],
    queryFn: () =>
      api.get<DailySummary[]>(`/logs/summary/daily?start_date=${startDate}&end_date=${endDate}`),
  });
}

export function useActiveGoal() {
  return useQuery({
    queryKey: ["active-goal"],
    queryFn: () => api.get<Goal>("/goals/active"),
  });
}

export function useUpdateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      logId,
      quantity,
      servingSizeId,
    }: {
      logId: number;
      quantity?: number;
      servingSizeId?: number | null;
    }) =>
      api.patch<Log>(`/logs/${logId}`, {
        ...(quantity !== undefined ? { quantity } : {}),
        ...(servingSizeId !== undefined ? { serving_size_id: servingSizeId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
    },
  });
}

export function useDeleteLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: number) => api.delete<void>(`/logs/${logId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
    },
  });
}

export function useItemSearch(query: string) {
  return useQuery({
    queryKey: ["item-search", query],
    queryFn: () => api.get<Item[]>(`/items?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
  });
}

export function useRecipeSearch(query: string) {
  return useQuery({
    queryKey: ["recipe-search", query],
    queryFn: async () => {
      const results = await api.get<Recipe[]>(`/recipes?q=${encodeURIComponent(query)}`);
      const seen = new Set<number>();
      return results.filter((r) => (seen.has(r.recipe_id) ? false : (seen.add(r.recipe_id), true)));
    },
    enabled: query.trim().length > 0,
  });
}

/** Creates a new log entry - item_id logs can now optionally carry a
 * serving_size_id too (see the new shared ServingPicker, used both
 * here and in the quantity-edit dialog), matching what editing an
 * existing log already supported. */
export function useCreateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      date: string;
      meal_type: MealType;
      item_id?: number;
      recipe_id?: number;
      quantity: number;
      serving_size_id?: number | null;
    }) => api.post<Log>("/logs", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
    },
  });
}

export function useItemsList() {
  return useQuery({
    queryKey: ["items-list"],
    queryFn: () => api.get<ItemDetail[]>("/items?limit=200"),
  });
}

export function useRecipesListForEditor() {
  return useQuery({
    queryKey: ["recipes-list-editor"],
    queryFn: () => api.get<Recipe[]>("/recipes?limit=200"),
  });
}

export function useItemDetail(itemId: number | null) {
  return useQuery({
    queryKey: ["item-detail", itemId],
    queryFn: () => api.get<ItemDetail>(`/items/${itemId}`),
    enabled: itemId != null,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<ItemDetail>("/items", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items-list"] });
      queryClient.invalidateQueries({ queryKey: ["item-search"] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: Record<string, unknown> }) =>
      api.patch<ItemDetail>(`/items/${itemId}`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items-list"] });
      queryClient.invalidateQueries({ queryKey: ["item-search"] });
      queryClient.invalidateQueries({ queryKey: ["item-detail", variables.itemId] });
    },
  });
}

export function useCreateServingSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, name, weightG }: { itemId: number; name: string; weightG: number }) =>
      api.post<ServingSize>(`/items/${itemId}/serving-sizes`, { name, weight_g: weightG }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["item-detail", variables.itemId] });
    },
  });
}

export function useDeleteServingSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, servingId }: { itemId: number; servingId: number }) =>
      api.delete<void>(`/items/${itemId}/serving-sizes/${servingId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["item-detail", variables.itemId] });
    },
  });
}

/** Uploads a photo via the same endpoint the Android Add Item flow
 * uses for the product-package photo step - purely a file-save now
 * (its old OCR-guess fields are unused, see the endpoint's own
 * docstring), returning an image_path the caller then sets directly on
 * the item via create/update. */
export function useUploadItemPhoto() {
  return useMutation({
    mutationFn: (file: File) => api.postFile<{ image_path: string }>("/items/scan-product-photo", file),
  });
}

export function useGroceryStores() {
  return useQuery({
    queryKey: ["grocery-stores"],
    queryFn: () => api.get<GroceryStore[]>("/grocery-stores"),
  });
}

export function useCreateGroceryStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<GroceryStore>("/grocery-stores", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-stores"] });
    },
  });
}

// ---- Goals ----

/** Full goal history, most recent start_date first - matches
 * GET /goals on the backend exactly (already sorted server-side). */
export function useGoalsList() {
  return useQuery({
    queryKey: ["goals-list"],
    queryFn: () => api.get<Goal[]>("/goals"),
  });
}

export interface GoalPayload {
  start_date: string;
  end_date: string | null;
  kcal_target: number;
  protein_g_target: number;
  carbs_g_target: number;
  fat_g_target: number;
  fiber_g_target: number;
  meal_splits?: MealGoalSplitInput[];
}

/** Both the create-time overlap/auto-truncate logic AND the invalidations
 * below matter for correctness here - a new goal can change what
 * "active" means (see the backend's own auto-truncation of the
 * previously open-ended goal), and can retroactively change what
 * target a past/future week's display compares against, so both the
 * list and the active-goal query need refreshing, not just the list. */
export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GoalPayload) => api.post<Goal>("/goals", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals-list"] });
      queryClient.invalidateQueries({ queryKey: ["active-goal"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: number; payload: Partial<GoalPayload> }) =>
      api.patch<Goal>(`/goals/${goalId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals-list"] });
      queryClient.invalidateQueries({ queryKey: ["active-goal"] });
    },
  });
}

/** Meal splits are a genuinely separate endpoint on the backend (bulk
 * replace, not part of the main PATCH) - see design discussion on
 * goals.py's own PUT /goals/{id}/meal-splits. Kept as its own mutation
 * here for the same reason, rather than trying to fold it into
 * useUpdateGoal's payload. */
export function useUpdateMealSplits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, splits }: { goalId: number; splits: MealGoalSplitInput[] }) =>
      api.put<Goal>(`/goals/${goalId}/meal-splits`, { splits }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals-list"] });
      queryClient.invalidateQueries({ queryKey: ["active-goal"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: number) => api.delete<void>(`/goals/${goalId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals-list"] });
      queryClient.invalidateQueries({ queryKey: ["active-goal"] });
    },
  });
}

// ---- Grocery lists ----

export function useTrips() {
  return useQuery({
    queryKey: ["grocery-trips"],
    queryFn: () => api.get<GroceryTrip[]>("/grocery-lists/trips"),
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { date: string; label?: string | null; store_id?: number | null }) =>
      api.post<GroceryTrip>("/grocery-lists/trips", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-trips"] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: number) => api.delete<void>(`/grocery-lists/trips/${tripId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-trips"] });
      // Deleting a trip drops its entries back into the pool
      // server-side (see the migration's ondelete=SET NULL) - refresh
      // entries too so the client picks that up immediately.
      queryClient.invalidateQueries({ queryKey: ["grocery-entries"] });
    },
  });
}

export function useGroceryEntries() {
  return useQuery({
    queryKey: ["grocery-entries"],
    queryFn: () => api.get<GroceryListEntry[]>("/grocery-lists/entries"),
  });
}

/** Adds an item to the grocery list - the target of the + icon on a
 * logged item's row (see design discussion - this replaced the pencil,
 * which became redundant once quantity editing lived elsewhere and the
 * item detail card grew its own quantity section too). */
export function useCreateGroceryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.post<GroceryListEntry>("/grocery-lists/entries", { item_id: itemId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-entries"] });
    },
  });
}

/** Adds a placeholder entry - no real catalog item yet, just a plain
 * label (see design discussion: the hot dog buns example). Resolving
 * it into a real item later happens through useUpdateGroceryEntry's
 * itemId param, not a separate endpoint. */
export function useCreatePlaceholderGroceryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (placeholderName: string) =>
      api.post<GroceryListEntry>("/grocery-lists/entries", { placeholder_name: placeholderName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-entries"] });
    },
  });
}

/** The drag-and-drop action itself (tripId), quantity edits, and/or
 * RESOLVING a placeholder into a real item (itemId) - see design
 * discussion, this is the same endpoint/mutation for all three, not a
 * separate "resolve" action. */
export function useUpdateGroceryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      tripId,
      quantity,
      itemId,
    }: {
      entryId: number;
      tripId?: number | null;
      quantity?: string | null;
      itemId?: number;
    }) =>
      api.patch<GroceryListEntry>(`/grocery-lists/entries/${entryId}`, {
        ...(tripId !== undefined ? { trip_id: tripId } : {}),
        ...(quantity !== undefined ? { quantity } : {}),
        ...(itemId !== undefined ? { item_id: itemId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-entries"] });
    },
  });
}

/** Checking an item off - removes it from the list entirely. */
export function useDeleteGroceryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => api.delete<void>(`/grocery-lists/entries/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-entries"] });
    },
  });
}

// ---- Recipe editor ----

export function useRecipeDetail(recipeId: number | null) {
  return useQuery({
    queryKey: ["recipe-detail", recipeId],
    queryFn: () => api.get<RecipeDetail>(`/recipes/${recipeId}`),
    enabled: recipeId != null,
  });
}

/** Always creates with an empty ingredients list, even though
 * POST /recipes accepts them bundled in directly - ingredients are
 * added afterward via their own endpoints instead (same "must exist
 * first" pattern as an item's serving sizes), which keeps this dialog
 * to one mode instead of two (accumulate-locally-then-bundle vs.
 * call-the-real-endpoint) depending on whether the recipe exists yet. */
export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      recipe_type: string;
      servings: number;
      source_url: string | null;
      image_path: string | null;
    }) => api.post<RecipeDetail>("/recipes", { ...payload, ingredients: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes-list-editor"] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, payload }: { recipeId: number; payload: Record<string, unknown> }) =>
      api.patch<RecipeDetail>(`/recipes/${recipeId}`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipes-list-editor"] });
      queryClient.invalidateQueries({ queryKey: ["recipe-detail", variables.recipeId] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: number) => api.delete<void>(`/recipes/${recipeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes-list-editor"] });
    },
  });
}

export function useAddRecipeIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      itemId,
      servingSizeId,
      quantity,
    }: {
      recipeId: number;
      itemId: number;
      servingSizeId: number | null;
      quantity: number;
    }) =>
      api.post<RecipeDetail>(`/recipes/${recipeId}/ingredients`, {
        item_id: itemId,
        serving_size_id: servingSizeId,
        quantity,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-detail", variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes-list-editor"] });
    },
  });
}

export function useUpdateRecipeIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      itemId,
      servingSizeId,
      quantity,
    }: {
      recipeId: number;
      itemId: number;
      servingSizeId: number | null;
      quantity: number;
    }) =>
      api.patch<RecipeDetail>(`/recipes/${recipeId}/ingredients/${itemId}`, {
        serving_size_id: servingSizeId,
        quantity,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-detail", variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes-list-editor"] });
    },
  });
}

export function useDeleteRecipeIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, itemId }: { recipeId: number; itemId: number }) =>
      api.delete<void>(`/recipes/${recipeId}/ingredients/${itemId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-detail", variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes-list-editor"] });
    },
  });
}

// ---- Barcode / label scanning ----

/** Never writes to the DB (see the endpoint's own docstring) - the
 * client just uses the result to pre-fill the item form. */
export function useScanBarcode() {
  return useMutation({
    mutationFn: (file: File) => api.postFile<BarcodeScanResult>("/items/scan-barcode", file),
  });
}

export function useScanLabel() {
  return useMutation({
    mutationFn: (file: File) => api.postFile<OcrScanResult>("/items/scan-label", file),
  });
}

// ---- Profile & settings ----

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/profile"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch<UserProfile>("/profile", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/** Read-only mirror of Health Connect's own readings (see backend
 * WeightHistoryEntry's docstring) - never written to from the web. */
export function useWeightHistory() {
  return useQuery({
    queryKey: ["weight-history"],
    queryFn: () => api.get<WeightHistoryEntry[]>("/profile/weight-history"),
  });
}

// ---- Recipe steps ----

export function useAddRecipeStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, text, timerSeconds }: { recipeId: number; text: string; timerSeconds: number | null }) =>
      api.post<RecipeDetail>(`/recipes/${recipeId}/steps`, { text, timer_seconds: timerSeconds }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-detail", variables.recipeId] });
    },
  });
}

export function useUpdateRecipeStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      stepId,
      text,
      timerSeconds,
    }: {
      recipeId: number;
      stepId: number;
      text?: string;
      timerSeconds?: number | null;
    }) =>
      api.patch<RecipeDetail>(`/recipes/${recipeId}/steps/${stepId}`, {
        ...(text !== undefined ? { text } : {}),
        ...(timerSeconds !== undefined ? { timer_seconds: timerSeconds } : {}),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-detail", variables.recipeId] });
    },
  });
}

export function useDeleteRecipeStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, stepId }: { recipeId: number; stepId: number }) =>
      api.delete<RecipeDetail>(`/recipes/${recipeId}/steps/${stepId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-detail", variables.recipeId] });
    },
  });
}

// ---- USDA FoodData Central ----

export type UsdaSearchKind = "whole" | "branded";

// Foundation + SR Legacy are lab-analyzed and best for raw/whole
// ingredients; Branded covers packaged products by name (see the
// backend's search_usda docstring).
const USDA_DATA_TYPES: Record<UsdaSearchKind, string> = {
  whole: "Foundation,SR Legacy",
  branded: "Branded",
};

/** Only fires for a non-null query - the caller sets it on an explicit
 * click, never on typing. The default USDA key (DEMO_KEY) allows 30
 * requests/hour SHARED with every other DEMO_KEY user, so this is
 * deliberately conservative: no automatic retry (a retried 429 just
 * burns another request), no refetch on window focus, and results
 * cached for an hour so re-running the same search costs nothing. */
export function useUsdaSearch(query: string | null, kind: UsdaSearchKind) {
  return useQuery({
    queryKey: ["usda-search", query, kind],
    queryFn: () =>
      api.get<UsdaFood[]>(
        `/usda/search?query=${encodeURIComponent(query ?? "")}&data_type=${encodeURIComponent(USDA_DATA_TYPES[kind])}&page_size=15`,
      ),
    enabled: !!query,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  });
}