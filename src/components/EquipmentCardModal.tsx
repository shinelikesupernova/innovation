'use client';

import React, { useMemo, useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Camera,
  Upload,
  Calendar,
  Thermometer,
  Gauge,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { EquipmentItem, TODAY_ISO } from '@/data/mock-data';
import {
  calculateDegradationForecast,
  calculateRemainingLife,
} from '@/lib/corrosion-math';

interface EquipmentCardModalProps {
  equipment: EquipmentItem;
  onClose: () => void;
  isDark: boolean;
}

export function EquipmentCardModal({
  equipment,
  onClose,
  isDark,
}: EquipmentCardModalProps) {
  const [attachedPhotos, setAttachedPhotos] = useState<Record<string, string>>({});

  const remainingLife = useMemo(
    () =>
      calculateRemainingLife(
        equipment.currentThickness,
        equipment.minThickness,
        equipment.corrosionRate,
        equipment.nominalThickness,
        new Date(TODAY_ISO)
      ),
    [equipment]
  );

  const forecast = useMemo(
    () =>
      calculateDegradationForecast(
        equipment.measurements,
        equipment.minThickness,
        5
      ),
    [equipment]
  );

  const statusConfig = {
    critical: {
      label: 'КРИТИЧЕСКИЙ РИСК',
      sub: 'Требуется немедленный ремонт / замена',
      bg: 'bg-red-500/15 border-red-500/40 text-red-400',
      badge: 'bg-red-500 text-white',
      icon: ShieldAlert,
    },
    warning: {
      label: 'ТРЕБУЕТ НАБЛЮДЕНИЯ',
      sub: 'Усиленный контроль толщины стенки',
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
      badge: 'bg-amber-500 text-slate-950',
      icon: AlertTriangle,
    },
    normal: {
      label: 'НОРМА',
      sub: 'Деградация в пределах проектных значений',
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
      badge: 'bg-emerald-500 text-white',
      icon: CheckCircle2,
    },
  }[equipment.status];

  const StatusIcon = statusConfig.icon;

  // Параметры SVG-кольца «Здоровье стенки»
  const outerRadius = 70;
  const minInnerRadius = 38;
  const maxWallPx = outerRadius - minInnerRadius;
  const currentRatio = Math.min(
    1,
    Math.max(0, equipment.currentThickness / equipment.nominalThickness)
  );
  const minRatio = Math.min(
    1,
    Math.max(0, equipment.minThickness / equipment.nominalThickness)
  );
  const currentInnerRadius = outerRadius - maxWallPx * currentRatio;
  const minAllowedRadius = outerRadius - maxWallPx * minRatio;

  const handleMockUpload = (inspectionId: string) => {
    setAttachedPhotos((prev) => ({
      ...prev,
      [inspectionId]: `Фото_дефекта_${equipment.tag}_${inspectionId}.jpg`,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Верхняя панель */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {equipment.tag}
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">{equipment.name}</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {equipment.plant} • Узел: {equipment.unit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Верхний блок: Крупный индикатор риска + Паспортные данные */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className={`rounded-xl border p-4 flex items-center gap-4 ${statusConfig.bg}`}
            >
              <div className={`p-3 rounded-xl ${statusConfig.badge}`}>
                <StatusIcon className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  Текущий статус риска
                </div>
                <div className="text-lg font-extrabold">{statusConfig.label}</div>
                <div className="text-xs opacity-80 mt-0.5">{statusConfig.sub}</div>
              </div>
            </div>

            <div
              className={`lg:col-span-2 rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 ${
                isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs opacity-60 mb-1">
                  <Layers className="w-3.5 h-3.5" /> Материал
                </div>
                <div className="font-semibold text-sm">{equipment.material}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs opacity-60 mb-1">
                  <Thermometer className="w-3.5 h-3.5" /> Температура
                </div>
                <div className="font-semibold text-sm">{equipment.operatingTempC} °C</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs opacity-60 mb-1">
                  <Gauge className="w-3.5 h-3.5" /> Давление
                </div>
                <div className="font-semibold text-sm">{equipment.operatingPressureMPa} МПа</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs opacity-60 mb-1">
                  <Calendar className="w-3.5 h-3.5" /> Остаточный ресурс
                </div>
                <div
                  className={`font-bold text-sm ${
                    remainingLife.remainingLifeYears < 2 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {remainingLife.remainingLifeYears} лет
                </div>
              </div>
            </div>
          </div>

          {/* Средний блок: Здоровье стенки + График тренда деградации */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Блок «Здоровье стенки» */}
            <div
              className={`rounded-xl border p-5 flex flex-col items-center justify-between ${
                isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-full flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">Здоровье стенки (Срез)</h3>
                <span className="text-xs font-mono opacity-70">
                  Потеря: {remainingLife.wallLossPercent}%
                </span>
              </div>

              {/* SVG-кольцо трубы */}
              <div className="relative flex items-center justify-center my-2">
                <svg width="170" height="170" viewBox="0 0 170 170">
                  {/* Потерянная толщина (красным — внешний контур номинала) */}
                  <circle
                    cx="85"
                    cy="85"
                    r={outerRadius}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={maxWallPx}
                    strokeOpacity={0.35}
                  />
                  {/* Остаточная текущая толщина (зеленым) */}
                  <circle
                    cx="85"
                    cy="85"
                    r={(outerRadius + currentInnerRadius) / 2}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={Math.max(2, outerRadius - currentInnerRadius)}
                  />
                  {/* Пунктирная граница t_min */}
                  <circle
                    cx="85"
                    cy="85"
                    r={minAllowedRadius}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {/* Внутренняя полость */}
                  <circle
                    cx="85"
                    cy="85"
                    r={minInnerRadius - 2}
                    fill={isDark ? '#0f172a' : '#ffffff'}
                  />
                  <text
                    x="85"
                    y="82"
                    textAnchor="middle"
                    className={`text-lg font-bold ${isDark ? 'fill-white' : 'fill-slate-900'}`}
                  >
                    {equipment.currentThickness} мм
                  </text>
                  <text
                    x="85"
                    y="98"
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400"
                  >
                    текущая
                  </text>
                </svg>
              </div>

              <div className="w-full grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/40">
                <div>
                  <div className="text-[10px] opacity-60 uppercase">Номинал</div>
                  <div className="font-mono font-bold text-sm">
                    {equipment.nominalThickness} мм
                  </div>
                </div>
                <div>
                  <div className="text-[10px] opacity-60 uppercase">Текущая</div>
                  <div className="font-mono font-bold text-sm text-emerald-400">
                    {equipment.currentThickness} мм
                  </div>
                </div>
                <div>
                  <div className="text-[10px] opacity-60 uppercase">t_min</div>
                  <div className="font-mono font-bold text-sm text-red-400">
                    {equipment.minThickness} мм
                  </div>
                </div>
              </div>
            </div>

            {/* График тренда деградации */}
            <div
              className={`lg:col-span-2 rounded-xl border p-5 flex flex-col ${
                isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold">
                    Тренд деградации и прогноз (Линейная регрессия)
                  </h3>
                  <p className="text-xs opacity-65">
                    Скорость коррозии: <span className="font-mono font-semibold">{equipment.corrosionRate} мм/год</span>
                    {forecast.intersectionDate && (
                      <>
                        {' '}
                        • Прогноз достижения t_min:{' '}
                        <span className="text-red-400 font-semibold">
                          {forecast.intersectionDate}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast.forecastPoints}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#334155' : '#e2e8f0'}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    />
                    <YAxis
                      domain={[
                        Math.floor(equipment.minThickness - 2),
                        Math.ceil(equipment.nominalThickness + 1),
                      ]}
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      unit=" мм"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine
                      y={equipment.minThickness}
                      stroke="#ef4444"
                      strokeWidth={2}
                      label={{
                        value: `t_min (${equipment.minThickness} мм)`,
                        position: 'insideTopRight',
                        fill: '#ef4444',
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Прогноз (регрессия)"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Scatter
                      dataKey="actual"
                      name="Фактический замер"
                      fill="#10b981"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* История проверок */}
          <div
            className={`rounded-xl border overflow-hidden ${
              isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="px-5 py-3 border-b border-slate-700/40 flex items-center justify-between">
              <h3 className="text-sm font-bold">История проверок и дефектов</h3>
              <span className="text-xs opacity-60">
                Всего записей: {equipment.inspections.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={
                    isDark ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }
                >
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Дата</th>
                    <th className="px-4 py-2.5 font-semibold">Метод / Инспектор</th>
                    <th className="px-4 py-2.5 font-semibold">Результат (Теги)</th>
                    <th className="px-4 py-2.5 font-semibold">Заключение</th>
                    <th className="px-4 py-2.5 font-semibold">Фото дефекта</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {equipment.inspections.map((ins) => (
                    <tr key={ins.id}>
                      <td className="px-4 py-3 font-mono whitespace-nowrap">{ins.date}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{ins.method}</div>
                        <div className="opacity-65">{ins.inspector}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ins.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                t.tone === 'red'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : t.tone === 'amber'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : t.tone === 'blue'
                                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {t.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">{ins.findings}</td>
                      <td className="px-4 py-3">
                        {ins.defectPhotoLabel || attachedPhotos[ins.id] ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            <Camera className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[140px]">
                              {attachedPhotos[ins.id] || ins.defectPhotoLabel}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleMockUpload(ins.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-colors ${
                              isDark
                                ? 'border-slate-600 hover:bg-slate-700 text-slate-300'
                                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Upload className="w-3 h-3" /> Прикрепить фото
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
