export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type ItemType = "product" | "ingredient";
export type RecipeType = "recipe" | "meal";

export interface NutritionTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface ExtendedNutritionTotals extends NutritionTotals {
  sugar_g: number;
  countable_sugar_g: number;
  saturated_fat_g: number;
  sodium_mg: number;
}

export interface LoggedRecipeIngredient {
  item_id: number | null;
  item_name: string;
  serving_size_id: number | null;
  serving_size_name: string | null;
  serving_size_weight_g: string | null;
  quantity: string;
  grams: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  countable_sugar_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
}

export interface Log {
  id: number;
  date: string;
  meal_type: MealType;
  item_id: number | null;
  recipe_id: number | null;
  serving_size_id: number | null;
  quantity: string;
  logged_at: string;
  kcal_logged: number;
  protein_g_logged: number;
  carbs_g_logged: number;
  fat_g_logged: number;
  fiber_g_logged: number;
  sugar_g_logged: number;
  countable_sugar_g_logged: number;
  saturated_fat_g_logged: number;
  sodium_mg_logged: number;
  item_name: string | null;
  recipe_name: string | null;
  image_path: string | null;
  serving_size_name: string | null;
  serving_size_weight_g: string | null;
  ingredients: LoggedRecipeIngredient[];
  has_ingredient_snapshot: boolean;
  recipe_servings_logged: string | null;
}

export interface DailySummary {
  date: string;
  totals: ExtendedNutritionTotals;
}

export interface MealGoalSplit {
  meal_type: MealType;
  pct_of_kcal: string;
  computed_totals: NutritionTotals;
}

/** Request payload shape for a meal split - mirrors MealGoalSplitIn on
 * the backend exactly (no computed_totals - that's output-only, always
 * derived live from the parent goal's targets, never sent up). */
export interface MealGoalSplitInput {
  meal_type: MealType;
  pct_of_kcal: number;
}

export interface Goal {
  id: number;
  start_date: string;
  end_date: string | null;
  kcal_target: string;
  protein_g_target: string;
  carbs_g_target: string;
  fat_g_target: string;
  fiber_g_target: string;
  meal_splits: MealGoalSplit[];
}

export interface GroceryStore {
  id: number;
  name: string;
}

export interface GroceryTrip {
  id: number;
  date: string;
  label: string | null;
  store_id: number | null;
  store: GroceryStore | null;
}

export interface GroceryListEntry {
  id: number;
  item_id: number | null;
  item_name: string;
  is_placeholder: boolean;
  grocery_stores: GroceryStore[];
  trip_id: number | null;
  quantity: string | null;
}

export interface ServingSize {
  id: number;
  item_id: number;
  name: string;
  weight_g: string;
}

export interface Item {
  item_id: number;
  name: string;
  brand: string | null;
  type: ItemType;
  image_path: string | null;
  kcal_100g: string | null;
}

export interface ItemDetail {
  item_id: number;
  name: string;
  barcode: string | null;
  brand: string | null;
  image_path: string | null;
  kcal_100g: string | null;
  protein_100g: string | null;
  carbs_100g: string | null;
  fat_100g: string | null;
  fiber_100g: string | null;
  sugar_100g: string | null;
  saturated_fat_100g: string | null;
  sodium_mg_100g: string | null;
  counts_as_added_sugar: boolean | null;
  type: ItemType;
  origin: string;
  serving_sizes: ServingSize[];
  grocery_stores: GroceryStore[];
  last_logged_at: string | null;
}

/** Mirrors BarcodeScanResult on the backend. */
export interface BarcodeScanResult {
  barcode: string | null;
  decoder_used: string | null;
  checksum_valid: boolean | null;
  item: ItemDetail | null;
}

/** Mirrors OcrMacros/OcrScanResult on the backend. */
export interface OcrMacros {
  kcal_100g: string | null;
  protein_100g: string | null;
  carbs_100g: string | null;
  fat_100g: string | null;
  fiber_100g: string | null;
  sugar_100g: string | null;
  saturated_fat_100g: string | null;
  sodium_mg_100g: string | null;
}

export interface OcrScanResult {
  raw_text: string;
  detected_language: string | null;
  per_100g_confirmed: boolean;
  macros: OcrMacros;
}

export interface Recipe {
  recipe_id: number;
  name: string;
  recipe_type: RecipeType;
  image_path: string | null;
  kcal_per_serving: number | null;
}

/** Mirrors RecipeIngredientOut on the backend. */
export interface RecipeIngredientDetail {
  item_id: number;
  item_name: string;
  serving_size_id: number | null;
  serving_size_name: string | null;
  serving_size_weight_g: string | null;
  quantity: string;
  image_path: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/** Full recipe shape - mirrors RecipeOut exactly. instructions and
 * image_path exist on the backend already but are deliberately left
 * out of this pass (see design discussion: instructions needs its own
 * design session, and image upload is a separate piece of work). */
export interface RecipeStep {
  id: number;
  step_number: number;
  text: string;
  timer_seconds: number | null;
}

export interface RecipeDetail {
  recipe_id: number;
  name: string;
  recipe_type: RecipeType;
  source_url: string | null;
  image_path: string | null;
  servings: string;
  ingredients: RecipeIngredientDetail[];
  steps: RecipeStep[];
  totals: ExtendedNutritionTotals;
  totals_per_serving: ExtendedNutritionTotals;
  last_logged_at: string | null;
}

export type PrimaryHormone = "estrogen" | "testosterone";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

/** Mirrors UserProfileOut on the backend. */
export interface UserProfile {
  id: number;
  name: string | null;
  profile_pic_path: string | null;
  height_cm: number | null;
  age: number | null;
  weight_kg: string | null;
  starting_weight_kg: string | null;
  goal_weight_kg: string | null;
  primary_hormone: PrimaryHormone | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  timezone: string;
  updated_at: string;
}

/** Mirrors WeightHistoryEntryOut on the backend - a read-only mirror
 * of Health Connect's own readings (see the backend model's own
 * docstring), never edited from the web. */
export interface WeightHistoryEntry {
  recorded_at: string;
  weight_kg: string;
}

/** Mirrors UsdaMacros - absent/null means USDA didn't report it, which
 * is different from a real 0 (the backend says so explicitly), so these
 * stay optional rather than defaulting to "0". */
export interface UsdaMacros {
  kcal_100g?: string | null;
  protein_100g?: string | null;
  carbs_100g?: string | null;
  fat_100g?: string | null;
  fiber_100g?: string | null;
  sugar_100g?: string | null;
  saturated_fat_100g?: string | null;
  sodium_mg_100g?: string | null;
}

/** Mirrors UsdaFoodSummaryOut. The search result already carries the
 * full macro set, so picking one needs no second detail request -
 * which matters, since the default USDA key is heavily rate-limited. */
export interface UsdaFood {
  fdc_id: number;
  description: string;
  data_type: string;
  brand_owner: string | null;
  macros: UsdaMacros;
}