import React, { useState, useRef, useEffect } from "react";
import { LEAGUES } from "../constants";
import { ChevronDown, Square, CheckSquare, RefreshCw } from "lucide-react";

interface Props {
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled: boolean;
  fixtureCounts?: Record<string, number>;
  onCheckFixtures?: () => void;
  isCheckingFixtures?: boolean;
}

export const LeagueSelector: React.FC<Props> = ({
  selected,
  onChange,
  disabled,
  fixtureCounts,
  onCheckFixtures,
  isCheckingFixtures,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLeague = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const selectAll = () => onChange(LEAGUES.map((l) => l.key));
  const clearAll = () => onChange([]);
  const selectWithFixtures = () => {
    if (!fixtureCounts) return;
    const withFixtures = LEAGUES.filter(
      (l) => (fixtureCounts[l.key] || 0) > 0,
    ).map((l) => l.key);
    onChange(withFixtures);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        Competitions ({selected.length})
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
          <div className="p-2 border-b border-slate-800 flex flex-col gap-2">
            {onCheckFixtures && (
              <button
                onClick={onCheckFixtures}
                disabled={isCheckingFixtures}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-[10px] uppercase font-bold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isCheckingFixtures ? "animate-spin" : ""}`}
                />
                {isCheckingFixtures ? "Checking..." : "Check Fixtures"}
              </button>
            )}
            <div className="flex justify-between gap-2">
              <button
                onClick={selectAll}
                className="flex-1 px-2 py-1 text-[10px] uppercase font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="flex-1 px-2 py-1 text-[10px] uppercase font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                Clear All
              </button>
              {fixtureCounts && Object.keys(fixtureCounts).length > 0 && (
                <button
                  onClick={selectWithFixtures}
                  className="flex-1 px-2 py-1 text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded transition-colors"
                >
                  With Fixtures
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
            {(
              [
                "Top European",
                "Other European",
                "Domestic Cups",
                "International",
                "Rest of World",
              ] as const
            ).map((group) => {
              const leaguesInGroup = LEAGUES.filter((l) => l.group === group);
              if (leaguesInGroup.length === 0) return null;

              return (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-800/50 mb-1">
                    {group}
                  </div>
                  {leaguesInGroup.map((league) => {
                    const isSelected = selected.includes(league.key);
                    const count = fixtureCounts
                      ? fixtureCounts[league.key]
                      : null;
                    const hasNoFixtures = count === 0;

                    return (
                      <button
                        key={league.key}
                        onClick={() => toggleLeague(league.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isSelected
                            ? "bg-blue-600/10 text-blue-200"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        } ${hasNoFixtures ? "opacity-50" : ""}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                        <div className="flex items-center justify-between min-w-0 flex-1">
                          <span className="truncate text-left">
                            {league.name}
                          </span>
                          {count !== null && (
                            <span
                              className={`text-[10px] font-bold tabular-nums ml-2 ${hasNoFixtures ? "text-slate-600" : "text-slate-500"}`}
                            >
                              ({count})
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
