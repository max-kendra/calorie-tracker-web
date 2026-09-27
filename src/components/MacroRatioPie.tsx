import type { MacroRatio } from "@/lib/macroRatio";
import { MACRO_COLORS } from "@/lib/colors";

interface MacroRatioPieProps {
  ratio: MacroRatio;
}

/** Plain CSS conic-gradient, not an SVG arc-path calculation - four
 * slices still doesn't need real arc trigonometry. Matches the
 * Android app's own convention exactly: protein/carbs/fat/fiber as
 * four genuine, independently-set slices (see design discussion -
 * this was wrong in an earlier pass, which treated fiber as unable to
 * join the ratio at all; Android already proves otherwise). */
export function MacroRatioPie({ ratio }: MacroRatioPieProps) {
  const proteinEnd = ratio.protein;
  const carbsEnd = proteinEnd + ratio.carbs;
  const fatEnd = carbsEnd + ratio.fat;

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-16 h-16 rounded-full shrink-0"
        style={{
          background: `conic-gradient(${MACRO_COLORS.protein} 0% ${proteinEnd}%, ${MACRO_COLORS.carbs} ${proteinEnd}% ${carbsEnd}%, ${MACRO_COLORS.fat} ${carbsEnd}% ${fatEnd}%, ${MACRO_COLORS.fiber} ${fatEnd}% 100%)`,
        }}
      />
      <div className="text-xs space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.protein }} />
          <span className="text-gray-600 dark:text-gray-300">Protein {ratio.protein}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.carbs }} />
          <span className="text-gray-600 dark:text-gray-300">Carbs {ratio.carbs}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fat }} />
          <span className="text-gray-600 dark:text-gray-300">Fat {ratio.fat}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fiber }} />
          <span className="text-gray-600 dark:text-gray-300">Fiber {ratio.fiber}%</span>
        </div>
      </div>
    </div>
  );
}