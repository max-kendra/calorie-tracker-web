import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { DailySummary, Goal, Log } from "./types";

/** All individual logged entries for the week in ONE call - each row
 * already carries date + meal_type, so per-meal/per-day/per-week
 * totals are just client-side grouping (see src/lib/macros.ts) rather
 * than needing a dedicated aggregate endpoint. */
export function useLogsRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["logs", startDate, endDate],
    queryFn: () => api.get<Log[]>(`/logs?start_date=${startDate}&end_date=${endDate}`),
  });
}

/** Backend still computes this (frozen-sum, same integrity as
 * everything else) - not strictly needed once you have useLogsRange
 * (you could sum client-side), but kept as a cheap sanity-check /
 * simpler path for day-total display specifically, since it's already
 * exactly the right shape (ExtendedNutritionTotals per date) without
 * any grouping logic on this end. */
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

/** Quantity-only edit, mirroring PATCH /logs/{id} exactly - see
 * LogUpdate on the backend for why quantity is the only thing this
 * (deliberately) supports for now: item_id/recipe_id/date/meal_type
 * aren't editable this way (that's "delete and re-log", not "edit"),
 * and serving_size_id editing needs a unit picker UI this doesn't have
 * yet (see design discussion - "edit the quantity or delete it
 * entirely" was the explicit scope). Invalidates every "logs" query
 * rather than just the current week's, since editing a log could
 * plausibly be viewed from more than one cached range. */
export function useUpdateLogQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, quantity }: { logId: number; quantity: number }) =>
      api.patch<Log>(`/logs/${logId}`, { quantity }),
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