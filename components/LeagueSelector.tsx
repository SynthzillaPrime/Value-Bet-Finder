import React, { useState, useRef, useEffect } from "react";
import { LEAGUES } from "../constants";
import { ChevronDown, Square, CheckSquare } from "lucide-react";

interface Props {
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled: boolean;
}

export const LeagueSelector: React.FC<Props> = ({
  selected,
  onChange,
  disabled,
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
          <div className="p-2 border-b border-slate-800 flex justify-between gap-2">
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
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
            {LEAGUES.map((league) => {
              const isSelected = selected.includes(league.key);
              return (
                <button
                  key={league.key}
                  onClick={() => toggleLeague(league.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-600/10 text-blue-200"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                  <span className="truncate">{league.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
