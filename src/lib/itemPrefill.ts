import type { ItemType, UsdaFood } from "@/api/types";

/** Values an item form can start out with instead of blank - used when
 * creating an item from something that already carries data (currently
 * a USDA search result). All strings, matching how the form's own
 * fields are held, and all optional. */
export interface ItemFormPrefill {
  name?: string;
  brand?: string;
  type?: ItemType;
  kcal100g?: string;
  protein100g?: string;
  carbs100g?: string;
  fat100g?: string;
  fiber100g?: string;
  sugar100g?: string;
  saturatedFat100g?: string;
  sodiumMg100g?: string;
  /** Sent on create only - "usda_import" for the USDA flow. */
  origin?: string;
}

/** USDA reports "absent" as null/undefined, which must stay a BLANK
 * field rather than becoming 0 - a blank tells the person "USDA didn't
 * have this, fill it in if you know it"; a 0 would silently claim
 * something false. */
function blankIfMissing(value: string | null | undefined): string {
  return value == null ? "" : value;
}

export function usdaFoodToPrefill(food: UsdaFood): ItemFormPrefill {
  const m = food.macros;
  return {
    name: food.description,
    brand: food.brand_owner ?? "",
    // Foundation / SR Legacy are raw and whole foods; Branded is a
    // packaged product - same split the backend's search defaults are
    // built around.
    type: food.data_type === "Branded" ? "product" : "ingredient",
    kcal100g: blankIfMissing(m.kcal_100g),
    protein100g: blankIfMissing(m.protein_100g),
    carbs100g: blankIfMissing(m.carbs_100g),
    fat100g: blankIfMissing(m.fat_100g),
    fiber100g: blankIfMissing(m.fiber_100g),
    sugar100g: blankIfMissing(m.sugar_100g),
    saturatedFat100g: blankIfMissing(m.saturated_fat_100g),
    sodiumMg100g: blankIfMissing(m.sodium_mg_100g),
    origin: "usda_import",
  };
}