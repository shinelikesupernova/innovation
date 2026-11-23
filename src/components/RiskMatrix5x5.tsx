'use client';

import React from 'react';
import { EquipmentItem } from '@/data/mock-data';
import { getRiskMatrixLevel } from '@/lib/corrosion-math';

interface RiskMatrix5x5Props {
  equipment: EquipmentItem[];
  onSelectEquipment: (item: EquipmentItem) => void;
  isDark: boolean;
}

export function RiskMatrix5x5({ equipment, onSelectEquipment, isDark }: RiskMatrix5x5Props) {
  // Ось Y (Тяжесть последствий): 5 сверху вниз до 1
  const rows = [5, 4, 3, 2, 1];
  // Ось X (Вероятность отказа): 1 слева направо до 5
  const cols = [1, 2, 3, 4, 5];

  const getCellBg = (prob: number, cons: number) => {
    const level = getRiskMatrixLevel(prob, cons);
    if (isDark) {
      switch (level) {
        case 'critical':
          return 'bg-red-500/25 hover:bg-red-500/35 border-red-500/30';
        case 'high':
          return 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/30';
        case 'medium':
          return 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/25';
        case 'low':
          return 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/25';
      }
    } else {
      switch (level) {
        case 'critical':
          return 'bg-red-100 hover:bg-red-200 border-red-200';
        case 'high':
          return 'bg-orange-100 hover:bg-orange-200 border-orange-200';
        case 'medium':
          return 'bg-amber-50 hover:bg-amber-100 border-amber-200';
        case 'low':
          return 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200';
      }
    }
  };

  const getDotColor = (status: EquipmentItem['status']) => {
    switch (status) {
      case 'critical':
        return 'bg-red-500 ring-red-400/50';
      case 'warning':
        return 'bg-amber-400 ring-amber-300/50';
      case 'normal':
        return 'bg-emerald-500 ring-emerald-400/50';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 flex-1">
        {/* Подпись оси Y */}
        <div className="flex items-center justify-center w-5">
          <span
            className={`text-[11px] font-medium uppercase tracking-wider -rotate-90 whitespace-nowrap ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Тяжесть последствий
          </span>
        </div>

        {/* Сетка 5x5 */}
        <div className="flex-1 grid grid-rows-5 gap-1.5">
          {rows.map((y) => (
            <div key={y} className="grid grid-cols-5 gap-1.5 min-h-[48px]">
              {cols.map((x) => {
                const itemsInCell = equipment.filter(
                  (eq) => eq.probability === x && eq.consequence === y
                );
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`relative rounded-md border p-1 flex flex-wrap items-center justify-center gap-1 transition-colors ${getCellBg(
                      x,
                      y
                    )}`}
                    title={`Вероятность: ${x}, Последствия: ${y}`}
                  >
                    <span
                      className={`absolute top-0.5 left-1 text-[9px] font-mono opacity-40 ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {x * y}
                    </span>
                    {itemsInCell.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectEquipment(item)}
                        className={`group relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ring-2 transition-transform hover:scale-110 ${getDotColor(
                          item.status
                        )}`}
                        title={`${item.tag} — ${item.name} (клик для открытия карточки)`}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Подпись оси X */}
      <div className="mt-2 pl-8 flex flex-col items-center">
        <div className="w-full grid grid-cols-5 text-center text-[10px] font-mono opacity-60 mb-1">
          <span>1 (Редко)</span>
          <span>2</span>
          <span>3 (Возможно)</span>
          <span>4</span>
          <span>5 (Часто)</span>
        </div>
        <span
          className={`text-[11px] font-medium uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Вероятность отказа
        </span>
      </div>
    </div>
  );
}
