import { useEffect, useRef, useState } from "react";
import type { ActivityLevel, GoalType, PrimaryHormone } from "@/api/types";
import { useProfile, useUpdateProfile, useUploadItemPhoto, useWeightHistory } from "@/api/hooks";
import { getFirstDayOfWeekOverride, setFirstDayOfWeekOverride } from "@/lib/locale";
import { parseDecimal } from "@/lib/format";
import { WeightChart } from "@/components/WeightChart";

const AUTO_SENTINEL = "auto";

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SettingsPage() {
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const weightHistoryQuery = useWeightHistory();
  const uploadPhoto = useUploadItemPhoto();
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [profilePicPath, setProfilePicPath] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [startingWeightKg, setStartingWeightKg] = useState("");
  const [goalWeightKg, setGoalWeightKg] = useState("");
  const [primaryHormone, setPrimaryHormone] = useState<PrimaryHormone | "">("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">("");
  const [goalType, setGoalType] = useState<GoalType | "">("");

  const [firstDaySetting, setFirstDaySetting] = useState<string>(() => {
    const override = getFirstDayOfWeekOverride();
    return override === null ? AUTO_SENTINEL : String(override);
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setName(p.name ?? "");
    setProfilePicPath(p.profile_pic_path);
    setHeightCm(p.height_cm != null ? String(p.height_cm) : "");
    setAge(p.age != null ? String(p.age) : "");
    setWeightKg(p.weight_kg ?? "");
    setStartingWeightKg(p.starting_weight_kg ?? "");
    setGoalWeightKg(p.goal_weight_kg ?? "");
    setPrimaryHormone(p.primary_hormone ?? "");
    setActivityLevel(p.activity_level ?? "");
    setGoalType(p.goal_type ?? "");
  }, [profileQuery.data]);

  function handleSaveProfile() {
    updateProfile.mutate({
      name: name.trim() || null,
      profile_pic_path: profilePicPath,
      height_cm: parseOptionalInt(heightCm),
      age: parseOptionalInt(age),
      weight_kg: parseOptionalNumber(weightKg),
      starting_weight_kg: parseOptionalNumber(startingWeightKg),
      goal_weight_kg: parseOptionalNumber(goalWeightKg),
      primary_hormone: primaryHormone || null,
      activity_level: activityLevel || null,
      goal_type: goalType || null,
    });
  }

  function handlePhotoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadPhoto.mutate(file, {
      onSuccess: (result) => setProfilePicPath(result.image_path),
    });
  }

  function handleFirstDayChange(value: string) {
    setFirstDaySetting(value);
    setFirstDayOfWeekOverride(value === AUTO_SENTINEL ? null : Number(value));
  }

  const inputClass = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm";
  const cardClass = "bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4";
  const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1";

  // Newest first - scanning recent readings is the common case for a
  // raw list, unlike the chart above it which reads left-to-right
  // chronologically.
  const sortedEntries = [...(weightHistoryQuery.data ?? [])].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Profile & Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Weight history - chart plus the raw values underneath it */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Weight history</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Synced from Health Connect via the Android app - read-only here. Edit or delete a reading in Health
            Connect (e.g. Libra) itself, then sync again from the app's Health Connect settings.
          </p>
          {weightHistoryQuery.isLoading ? (
            <div className="text-sm text-gray-400 dark:text-gray-500">Loading...</div>
          ) : weightHistoryQuery.isError ? (
            <div className="text-sm text-red-500">Couldn't load weight history: {(weightHistoryQuery.error as Error).message}</div>
          ) : (
            <>
              <WeightChart entries={weightHistoryQuery.data ?? []} />
              {sortedEntries.length > 0 && (
                <div className="mt-4 max-h-80 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
                  {sortedEntries.map((entry, i) => (
                    <div
                      key={`${entry.recorded_at}-${i}`}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-b-0"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(entry.recorded_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="text-gray-800 dark:text-gray-100 font-medium">
                        {parseDecimal(entry.weight_kg).toFixed(1)} kg
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Profile + Preferences */}
        <div>
          <div className={cardClass}>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Profile</h2>
            {profileQuery.isLoading ? (
              <div className="text-sm text-gray-400 dark:text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {profilePicPath ? (
                    <img src={`/${profilePicPath}`} alt="" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700" />
                  )}
                  <button
                    onClick={() => photoFileInputRef.current?.click()}
                    disabled={uploadPhoto.isPending}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
                  >
                    {uploadPhoto.isPending ? "Uploading..." : profilePicPath ? "Change photo" : "Add photo"}
                  </button>
                  <input ref={photoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileSelected} />
                </div>
                {uploadPhoto.isError && <div className="text-xs text-red-500">{(uploadPhoto.error as Error).message}</div>}

                <div>
                  <label className={labelClass}>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Height (cm)</label>
                    <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Current weight (kg) - manual fallback, used for the TDEE calculation only when no synced Health Connect reading exists
                  </label>
                  <input type="number" step="any" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Starting weight (kg)</label>
                    <input type="number" step="any" value={startingWeightKg} onChange={(e) => setStartingWeightKg(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Goal weight (kg)</label>
                    <input type="number" step="any" value={goalWeightKg} onChange={(e) => setGoalWeightKg(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Primary hormone</label>
                  <select value={primaryHormone} onChange={(e) => setPrimaryHormone(e.target.value as PrimaryHormone | "")} className={inputClass}>
                    <option value="">Not set</option>
                    <option value="estrogen">Estrogen</option>
                    <option value="testosterone">Testosterone</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Activity level</label>
                  <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel | "")} className={inputClass}>
                    <option value="">Not set</option>
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="active">Active</option>
                    <option value="very_active">Very active</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Goal type</label>
                  <select value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType | "")} className={inputClass}>
                    <option value="">Not set</option>
                    <option value="lose">Lose</option>
                    <option value="maintain">Maintain</option>
                    <option value="gain">Gain</option>
                  </select>
                </div>

                {updateProfile.isError && (
                  <div className="text-xs text-red-500">{(updateProfile.error as Error).message}</div>
                )}
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-600"
                >
                  {updateProfile.isPending ? "Saving..." : "Save profile"}
                </button>
              </div>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Preferences</h2>
            <label className={labelClass}>First day of the week</label>
            <select value={firstDaySetting} onChange={(e) => handleFirstDayChange(e.target.value)} className={inputClass}>
              <option value={AUTO_SENTINEL}>Auto (detect from browser)</option>
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}