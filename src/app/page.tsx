'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  LayoutDashboard,
  List,
  MapPin,
  Moon,
  Search,
  ShieldAlert,
  Sun,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
} from 'recharts';
import { EQUIPMENT_DATA, EquipmentItem, TODAY_ISO } from '@/data/mock-data';
import { calculateRemainingLife } from '@/lib/corrosion-math';
import { EquipmentCardModal } from '@/components/EquipmentCardModal';
import { PlantVisualization } from '@/components/PlantVisualization';

type TabKey = 'dashboard' | 'registry' | 'passports' | 'visualization';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#00B2BC', '#a855f7', '#10b981', '#64748b'];

function getEpbStatus(epbExpiryDate: string | null) {
  if (!epbExpiryDate) {
    return { level: 'red' as const, label: 'Нет ЭПБ', daysLeft: null };
  }
  const todayMs = new Date(TODAY_ISO).getTime();
  const diffDays = Math.ceil(
    (new Date(epbExpiryDate).getTime() - todayMs) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) {
    return { level: 'red' as const, label: `Просрочена (${epbExpiryDate})`, daysLeft: diffDays };
  }
  if (diffDays <= 180) {
    return { level: 'yellow' as const, label: `Осталось ${diffDays} дн.`, daysLeft: diffDays };
  }
  return { level: 'green' as const, label: `До ${epbExpiryDate}`, daysLeft: diffDays };
}

export default function CorrosionDSSPage() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [passportEqId, setPassportEqId] = useState<string>(EQUIPMENT_DATA[0].id);

  // Фильтры реестра
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [mechanismFilter, setMechanismFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Выбор завода и производства (концепт с заделом на масштабирование)
  const [selectedPlant] = useState('ПОЛИЭФ');
  const [selectedProduction] = useState('ТФК');

  const plantEquipment = useMemo(
    () =>
      EQUIPMENT_DATA.filter(
        (e) => e.plantName === selectedPlant && e.productionName === selectedProduction
      ),
    [selectedPlant, selectedProduction]
  );

  // Расчет KPI и двух светофоров (Коррозия + ЭПБ 180 дней)
  const kpi = useMemo(() => {
    const total = plantEquipment.length;
    const critical = plantEquipment.filter((e) => e.status === 'critical').length;
    const warning = plantEquipment.filter((e) => e.status === 'warning').length;
    const normal = plantEquipment.filter((e) => e.status === 'normal').length;
    const overdue = plantEquipment.filter((e) => e.nextInspection < TODAY_ISO).length;
    const avgRate = (
      plantEquipment.reduce((acc, e) => acc + e.corrosionRate, 0) / (total || 1)
    ).toFixed(2);

    // Светофор ЭПБ
    const todayMs = new Date(TODAY_ISO).getTime();
    const ms180Days = 180 * 24 * 60 * 60 * 1000;
    let epbRed = 0;
    let epbYellow = 0;
    let epbGreen = 0;

    plantEquipment.forEach((e) => {
      if (!e.epbExpiryDate) {
        epbRed++;
        return;
      }
      const diff = new Date(e.epbExpiryDate).getTime() - todayMs;
      if (diff < 0) {
        epbRed++;
      } else if (diff <= ms180Days) {
        epbYellow++;
      } else {
        epbGreen++;
      }
    });

    return { total, critical, warning, normal, overdue, avgRate, epbRed, epbYellow, epbGreen };
  }, [plantEquipment]);

  // Топ-5 проблемного оборудования (сортировка по наименьшему остаточному ресурсу)
  const top5Problematic = useMemo(() => {
    return [...EQUIPMENT_DATA]
      .map((item) => ({
        item,
        rl: calculateRemainingLife(
          item.currentThickness,
          item.minThickness,
          item.corrosionRate,
          item.nominalThickness,
          new Date(TODAY_ISO)
        ).remainingLifeYears,
      }))
      .sort((a, b) => a.rl - b.rl)
      .slice(0, 5);
  }, []);

  // Данные для круговой диаграммы механизмов коррозии
  const mechanismStats = useMemo(() => {
    const map = new Map<string, number>();
    EQUIPMENT_DATA.forEach((e) => {
      map.set(e.mechanism, (map.get(e.mechanism) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, []);

  // Уникальные значения для фильтров
  const units = useMemo(
    () => Array.from(new Set(EQUIPMENT_DATA.map((e) => e.unit))),
    []
  );
  const mechanisms = useMemo(
    () => Array.from(new Set(EQUIPMENT_DATA.map((e) => e.mechanism))),
    []
  );

  // Отфильтрованный реестр
  const filteredEquipment = useMemo(() => {
    return EQUIPMENT_DATA.filter((e) => {
      const matchesSearch =
        e.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUnit = unitFilter === 'all' || e.unit === unitFilter;
      const matchesMech =
        mechanismFilter === 'all' || e.mechanism === mechanismFilter;
      const matchesRisk = riskFilter === 'all' || e.status === riskFilter;
      return matchesSearch && matchesUnit && matchesMech && matchesRisk;
    });
  }, [searchQuery, unitFilter, mechanismFilter, riskFilter]);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? 'bg-[#061419] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Верхняя навигационная панель */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          isDark
            ? 'bg-[#061419]/85 border-[#143642]'
            : 'bg-white/85 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#008C95] to-[#00B2BC] flex items-center justify-center text-white font-black shadow-lg shadow-sky-500/20">
              КМ
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight leading-none">
                СИБУР • CORROSION-DSS
              </h1>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                СППР контроля коррозии и остаточного ресурса
              </p>
            </div>
          </div>

          {/* Навигация */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'dashboard', label: 'Ситуационный центр', icon: LayoutDashboard },
              { id: 'registry', label: 'Реестр оборудования', icon: List },
              { id: 'passports', label: 'Паспорта и замеры', icon: FileText },
              { id: 'visualization', label: '2D / 3D Визуализация', icon: MapPin },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#008C95] text-white shadow-sm'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-[#0B1E26]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Переключатель темы */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-[#143642] bg-[#0B1E26] hover:bg-slate-800 text-amber-400'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
            title="Переключить тему"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Мобильная навигация */}
        <div className="flex md:hidden border-t border-[#143642]/40 px-2 py-1.5 gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Дашборд' },
            { id: 'registry', label: 'Реестр' },
            { id: 'visualization', label: '2D / 3D' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold ${
                activeTab === tab.id
                  ? 'bg-[#008C95] text-white'
                  : isDark
                  ? 'text-slate-400'
                  : 'text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Панель выбора Завода и Производства (Концепт масштабирования) */}
      <div
        className={`border-b ${
          isDark ? 'bg-[#0B1E26]/50 border-[#143642]' : 'bg-slate-100/80 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="opacity-60 font-medium">Завод:</span>
            <button className="px-3 py-1 rounded-md bg-[#008C95]/20 text-[#00B2BC] border border-[#008C95]/40 font-bold">
              ПОЛИЭФ
            </button>
            <span
              className={`px-2.5 py-1 rounded-md border border-dashed opacity-50 cursor-not-allowed ${
                isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'
              }`}
              title="В разработке: подключение других заводов"
            >
              + Добавить завод
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="opacity-60 font-medium">Производство:</span>
            <button className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
              Производство ТФК
            </button>
            <span
              className={`px-2.5 py-1 rounded-md border border-dashed opacity-50 cursor-not-allowed ${
                isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'
              }`}
              title="В разработке: подключение других производств"
            >
              + Добавить производство
            </span>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* KPI-виджеты */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div
                className={`rounded-2xl border p-4 ${
                  isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-65 mb-2">
                  <span>Всего оборудования</span>
                  <Activity className="w-4 h-4 text-[#00B2BC]" />
                </div>
                <div className="text-2xl font-black">{kpi.total}</div>
                <div className="text-[11px] opacity-60 mt-1">
                  ПОЛИЭФ • ТФК
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-65 mb-2">
                  <span>Риск коррозии (Светофор)</span>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-lg font-black text-red-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    {kpi.critical}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-lg font-black text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    {kpi.warning}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-lg font-black text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    {kpi.normal}
                  </span>
                </div>
                <div className="text-[11px] opacity-60 mt-1">
                  Высокая / Средняя / Норма
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-65 mb-2">
                  <span>Экспертиза ЭПБ (≤ 180 дн.)</span>
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-lg font-black text-red-400"
                    title="Просрочена или отсутствует"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    {kpi.epbRed}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-lg font-black text-amber-400"
                    title="Осталось <= 180 дней"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    {kpi.epbYellow}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-lg font-black text-emerald-400"
                    title="Действует > 180 дней"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    {kpi.epbGreen}
                  </span>
                </div>
                <div className="text-[11px] opacity-60 mt-1">
                  Нет/проср. / ≤180 дн. / Есть
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-65 mb-2">
                  <span>Просроченные инспекции</span>
                  <Clock className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-black text-red-400">{kpi.overdue}</div>
                <div className="text-[11px] opacity-60 mt-1">
                  На дату {TODAY_ISO}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-65 mb-2">
                  <span>Средняя скорость коррозии</span>
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black">
                  {kpi.avgRate} <span className="text-sm font-normal opacity-70">мм/год</span>
                </div>
                <div className="text-[11px] opacity-60 mt-1">
                  По узлам ТФК
                </div>
              </div>
            </div>

            {/* Основная сетка дашборда */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Левая колонка: Только красные позиции + Светофор списком */}
              <div className="lg:col-span-7 space-y-6">
                {/* Отдельный блок: Только красные позиции */}
                <div
                  className={`rounded-2xl border p-5 ${
                    isDark
                      ? 'bg-red-950/20 border-red-500/30'
                      : 'bg-red-50/70 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <h2 className="text-base font-bold text-red-400">
                        Критическая зона (Только красные позиции)
                      </h2>
                    </div>
                    <span className="text-xs font-mono opacity-75">
                      Требуют немедленного внимания
                    </span>
                  </div>

                  <div className="space-y-2">
                    {plantEquipment
                      .filter(
                        (eq) =>
                          eq.status === 'critical' ||
                          getEpbStatus(eq.epbExpiryDate).level === 'red'
                      )
                      .map((eq) => {
                        const epb = getEpbStatus(eq.epbExpiryDate);
                        return (
                          <button
                            key={eq.id}
                            onClick={() => setSelectedEquipment(eq)}
                            className={`w-full text-left rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2 transition-colors ${
                              isDark
                                ? 'bg-[#0B1E26]/80 border-red-500/30 hover:border-red-400'
                                : 'bg-white border-red-200 hover:border-red-400'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-red-400">
                                  {eq.tag}
                                </span>
                                <span className="text-xs font-semibold">{eq.name}</span>
                              </div>
                              <div className="text-[11px] opacity-65 mt-0.5">
                                Узел: {eq.unit} • Скорость коррозии: {eq.corrosionRate} мм/год
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {eq.status === 'critical' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                  Коррозия: Критич.
                                </span>
                              )}
                              {epb.level === 'red' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                  ЭПБ: {epb.label}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Светофор списком по каждому оборудованию */}
                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-base font-bold">
                        Светофор по оборудованию (Коррозия + ЭПБ)
                      </h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Кликните по строке для открытия «Рентгена» оборудования
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/40">
                    {plantEquipment.map((eq) => {
                      const epb = getEpbStatus(eq.epbExpiryDate);
                      return (
                        <button
                          key={eq.id}
                          onClick={() => setSelectedEquipment(eq)}
                          className={`w-full text-left py-2.5 px-2 rounded-lg flex flex-wrap items-center justify-between gap-3 transition-colors ${
                            isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-[180px] flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#00B2BC]">
                                {eq.tag}
                              </span>
                              <span className="text-xs font-medium truncate">{eq.name}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            {/* Светофор коррозии */}
                            <div className="flex items-center gap-1.5 min-w-[125px]">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  eq.status === 'critical'
                                    ? 'bg-red-500'
                                    : eq.status === 'warning'
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span className="opacity-80">
                                {eq.status === 'critical'
                                  ? 'Корр: Высокая'
                                  : eq.status === 'warning'
                                  ? 'Корр: Средняя'
                                  : 'Корр: Норма'}
                              </span>
                            </div>

                            {/* Светофор ЭПБ */}
                            <div className="flex items-center gap-1.5 min-w-[155px]">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  epb.level === 'red'
                                    ? 'bg-red-500'
                                    : epb.level === 'yellow'
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span className="opacity-80 truncate">ЭПБ: {epb.label}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Круговая диаграмма механизмов коррозии */}
              <div
                className={`lg:col-span-5 rounded-2xl border p-5 flex flex-col ${
                  isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                }`}
              >
                <h2 className="text-base font-bold mb-1">Механизмы коррозии</h2>
                <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Распределение парка оборудования по типам деградации
                </p>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mechanismStats}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {mechanismStats.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderColor: isDark ? '#334155' : '#cbd5e1',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {mechanismStats.map((m, idx) => (
                    <div key={m.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="truncate">{m.name}</span>
                      <span className="ml-auto font-mono font-bold opacity-75">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Топ-5 проблемного оборудования со спарклайнами */}
            <div
              className={`rounded-2xl border p-5 ${
                isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold">
                    Топ-5 проблемного оборудования (по остаточному ресурсу)
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Динамика утонения стенки за последние 5 лет
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {top5Problematic.map(({ item, rl }) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEquipment(item)}
                    className={`text-left rounded-xl border p-3.5 transition-all hover:scale-[1.02] ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700 hover:border-[#008C95]/50'
                        : 'bg-slate-50 border-slate-200 hover:border-sky-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-[#00B2BC]">
                        {item.tag}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          rl < 2
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {rl} лет
                      </span>
                    </div>
                    <div className="text-xs font-semibold truncate mb-2">{item.name}</div>
                    <div className="h-12 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={item.measurements}>
                          <Line
                            type="monotone"
                            dataKey="thickness"
                            stroke={item.status === 'critical' ? '#ef4444' : '#f59e0b'}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between text-[10px] opacity-65 mt-1 font-mono">
                      <span>{item.currentThickness} мм</span>
                      <span>t_min: {item.minThickness}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'registry' && (
          <div className="space-y-4">
            {/* Панель фильтров */}
            <div
              className={`rounded-2xl border p-4 flex flex-wrap items-center gap-3 ${
                isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по тегу или названию..."
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-[#061419] border-slate-700 text-white focus:border-[#008C95]'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#008C95]'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-4 h-4 opacity-50" />
                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    isDark
                      ? 'bg-[#061419] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">Все узлы</option>
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>

                <select
                  value={mechanismFilter}
                  onChange={(e) => setMechanismFilter(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    isDark
                      ? 'bg-[#061419] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">Все механизмы</option>
                  {mechanisms.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    isDark
                      ? 'bg-[#061419] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">Любой риск</option>
                  <option value="critical">Критический</option>
                  <option value="warning">Требует наблюдения</option>
                  <option value="normal">Норма</option>
                </select>
              </div>
            </div>

            {/* Таблица реестра */}
            <div
              className={`rounded-2xl border overflow-hidden ${
                isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className={
                      isDark ? 'bg-[#061419]/60 text-slate-400' : 'bg-slate-100 text-slate-600'
                    }
                  >
                    <tr>
                      <th className="px-4 py-3 font-semibold">Статус</th>
                      <th className="px-4 py-3 font-semibold">Тег / Оборудование</th>
                      <th className="px-4 py-3 font-semibold">Узел</th>
                      <th className="px-4 py-3 font-semibold">Результат (Теги)</th>
                      <th className="px-4 py-3 font-semibold">Последняя проверка</th>
                      <th className="px-4 py-3 font-semibold">Следующая проверка</th>
                      <th className="px-4 py-3 font-semibold">Остаточный ресурс</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredEquipment.map((eq) => {
                      const isOverdue = eq.nextInspection < TODAY_ISO;
                      const rl = calculateRemainingLife(
                        eq.currentThickness,
                        eq.minThickness,
                        eq.corrosionRate,
                        eq.nominalThickness,
                        new Date(TODAY_ISO)
                      );
                      return (
                        <tr
                          key={eq.id}
                          onClick={() => setSelectedEquipment(eq)}
                          className={`cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            {eq.status === 'critical' && (
                              <span className="inline-flex items-center gap-1.5 text-red-400 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                Критический
                              </span>
                            )}
                            {eq.status === 'warning' && (
                              <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                Наблюдение
                              </span>
                            )}
                            {eq.status === 'normal' && (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Норма
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-[#00B2BC]">{eq.tag}</div>
                            <div className="font-medium">{eq.name}</div>
                          </td>
                          <td className="px-4 py-3.5 opacity-80">{eq.unit}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#008C95]/15 text-[#00B2BC] border border-[#008C95]/30">
                                {eq.mechanism}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  eq.status === 'critical'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : eq.status === 'warning'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                Риск:{' '}
                                {eq.status === 'critical'
                                  ? 'Высокий'
                                  : eq.status === 'warning'
                                  ? 'Средний'
                                  : 'Низкий'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono opacity-80">
                            {eq.lastInspection}
                          </td>
                          <td className="px-4 py-3.5 font-mono">
                            <span
                              className={
                                isOverdue
                                  ? 'text-red-400 font-bold inline-flex items-center gap-1'
                                  : 'opacity-80'
                              }
                            >
                              {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                              {eq.nextInspection}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold">
                            <span
                              className={
                                rl.remainingLifeYears < 2
                                  ? 'text-red-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {rl.remainingLifeYears} лет
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'passports' && (() => {
          const activeEq =
            plantEquipment.find((e) => e.id === passportEqId) || plantEquipment[0];
          const epb = getEpbStatus(activeEq.epbExpiryDate);
          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Левый список выбора оборудования */}
              <div
                className={`lg:col-span-4 rounded-2xl border p-4 space-y-2 h-fit ${
                  isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider opacity-60 px-2 pb-1">
                  Выберите оборудование ({plantEquipment.length})
                </div>
                {plantEquipment.map((eq) => {
                  const isSelected = eq.id === activeEq.id;
                  return (
                    <button
                      key={eq.id}
                      onClick={() => setPassportEqId(eq.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#008C95]/20 border-[#008C95] shadow-sm'
                          : isDark
                          ? 'bg-[#061419]/60 border-[#143642] hover:border-[#008C95]/50'
                          : 'bg-slate-50 border-slate-200 hover:border-[#008C95]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#00B2BC]">
                            {eq.tag}
                          </span>
                          <span className="text-xs font-semibold truncate">{eq.name}</span>
                        </div>
                        <div className="text-[11px] opacity-60 mt-0.5">
                          Узел: {eq.unit} • {eq.material}
                        </div>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          eq.status === 'critical'
                            ? 'bg-red-500'
                            : eq.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Правая часть: Паспорт, Замеры, История эксплуатации */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. Паспорт оборудования */}
                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-[#008C95]/20 text-[#00B2BC] font-mono font-bold text-xs">
                          {activeEq.tag}
                        </span>
                        <h2 className="text-lg font-bold">{activeEq.name}</h2>
                      </div>
                      <p className="text-xs opacity-65 mt-0.5">
                        {activeEq.plantName} • Производство {activeEq.productionName} • Узел {activeEq.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedEquipment(activeEq)}
                      className="px-3 py-1.5 rounded-lg bg-[#008C95] hover:bg-[#00767e] text-white text-xs font-semibold transition-colors"
                    >
                      Открыть «Рентген» (График)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="opacity-60 mb-1">Марка стали</div>
                      <div className="font-bold">{activeEq.material}</div>
                    </div>
                    <div>
                      <div className="opacity-60 mb-1">Рабочая среда (T / P)</div>
                      <div className="font-bold">
                        {activeEq.operatingTempC} °C / {activeEq.operatingPressureMPa} МПа
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60 mb-1">Толщина (Ном / Тек / min)</div>
                      <div className="font-mono font-bold">
                        {activeEq.nominalThickness} /{' '}
                        <span className="text-emerald-400">{activeEq.currentThickness}</span> /{' '}
                        <span className="text-red-400">{activeEq.minThickness}</span> мм
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60 mb-1">Экспертиза ЭПБ</div>
                      <div
                        className={`font-bold ${
                          epb.level === 'red'
                            ? 'text-red-400'
                            : epb.level === 'yellow'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {epb.label}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Таблица замеров толщины стенки (УЗТ) */}
                <div
                  className={`rounded-2xl border overflow-hidden ${
                    isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="px-5 py-3 border-b border-slate-700/30 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Замеры толщины стенки (УЗТ)</h3>
                    <span className="text-xs opacity-60">
                      Скорость коррозии: {activeEq.corrosionRate} мм/год
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead
                        className={
                          isDark ? 'bg-[#061419]/80 text-slate-400' : 'bg-slate-100 text-slate-600'
                        }
                      >
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Дата замера</th>
                          <th className="px-4 py-2.5 font-semibold">Толщина (мм)</th>
                          <th className="px-4 py-2.5 font-semibold">Утонение от номинала</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {[...activeEq.measurements].reverse().map((m, idx) => {
                          const loss = (activeEq.nominalThickness - m.thickness).toFixed(2);
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-2.5 font-mono">{m.date}</td>
                              <td className="px-4 py-2.5 font-mono font-bold text-[#00B2BC]">
                                {m.thickness} мм
                              </td>
                              <td className="px-4 py-2.5 font-mono text-red-400">-{loss} мм</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. История эксплуатации и инспекций */}
                <div
                  className={`rounded-2xl border p-5 ${
                    isDark ? 'bg-[#0B1E26]/90 border-[#143642]' : 'bg-white border-slate-200'
                  }`}
                >
                  <h3 className="text-sm font-bold mb-3">История эксплуатации и проверок</h3>
                  <div className="space-y-3">
                    {activeEq.inspections.map((ins) => (
                      <div
                        key={ins.id}
                        className={`p-3.5 rounded-xl border ${
                          isDark ? 'bg-[#061419]/60 border-[#143642]' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#00B2BC]">
                              {ins.date}
                            </span>
                            <span className="text-xs font-semibold">
                              {ins.method} ({ins.inspector})
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            {ins.tags.map((t, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  t.tone === 'red'
                                    ? 'bg-red-500/20 text-red-400'
                                    : t.tone === 'amber'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {t.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs opacity-80">{ins.findings}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'visualization' && (
          <PlantVisualization
            equipment={EQUIPMENT_DATA}
            onSelectEquipment={setSelectedEquipment}
            isDark={isDark}
          />
        )}
      </main>

      {/* Модальное окно «Рентген» карточки оборудования */}
      {selectedEquipment && (
        <EquipmentCardModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
