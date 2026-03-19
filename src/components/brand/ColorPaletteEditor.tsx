"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ColorPaletteEditorProps {
  label: string;
  value: string[];
  onChange: (colors: string[]) => void;
  max?: number;
  hint?: string;
}

export function ColorPaletteEditor({ label, value, onChange, max = 6, hint }: ColorPaletteEditorProps) {
  const [inputVal, setInputVal] = useState("#ffffff");

  function addColor() {
    if (value.length >= max) return;
    if (!/^#[0-9a-fA-F]{6}$/.test(inputVal)) return;
    if (value.includes(inputVal)) return;
    onChange([...value, inputVal]);
  }

  function removeColor(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateColor(index: number, newColor: string) {
    const updated = [...value];
    updated[index] = newColor;
    onChange(updated);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      {/* Existing swatches */}
      <div className="flex flex-wrap gap-2">
        {value.map((color, i) => (
          <div key={i} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
            <input
              type="color"
              value={color}
              onChange={(e) => updateColor(i, e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
              title="Farbe ändern"
            />
            <span className="text-xs font-mono text-gray-600">{color}</span>
            <button
              type="button"
              onClick={() => removeColor(i)}
              className="ml-1 text-gray-400 hover:text-red-500 transition-colors text-xs leading-none"
              title="Entfernen"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add new */}
        {value.length < max && (
          <div className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1.5">
            <input
              type="color"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              maxLength={7}
              className={cn(
                "w-16 text-xs font-mono text-gray-600 border-0 bg-transparent outline-none",
                "focus:ring-0 p-0"
              )}
              placeholder="#000000"
            />
            <button
              type="button"
              onClick={addColor}
              className="ml-1 text-brand-600 hover:text-brand-700 text-xs font-medium"
            >
              + Hinzufügen
            </button>
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
