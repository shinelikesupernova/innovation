import { ThicknessPoint } from '@/lib/corrosion-math';

export type RiskStatus = 'normal' | 'warning' | 'critical';

export type CorrosionMechanism =
  | 'Питтинг'
  | 'Эрозия-коррозия'
  | 'КРН'
  | 'Сульфидная коррозия'
  | 'Общая коррозия'
  | 'Коррозия под изоляцией';

export interface InspectionRecord {
  id: string;
  date: string;
  inspector: string;
  method: string;
  tags: Array<{ label: string; tone: 'red' | 'amber' | 'green' | 'blue' }>;
  findings: string;
  defectPhotoLabel?: string;
}

export interface EquipmentItem {
  id: string;
  plantName: string; // Например: 'ПОЛИЭФ'
  productionName: string; // Например: 'ТФК'
  tag: string;
  name: string;
  unit: string;
  plant: string;
  type: 'pipeline' | 'vessel' | 'heat_exchanger' | 'reactor';
  material: string;
  nominalThickness: number;
  minThickness: number;
  currentThickness: number;
  corrosionRate: number; // мм/год
  probability: 1 | 2 | 3 | 4 | 5;
  consequence: 1 | 2 | 3 | 4 | 5;
  status: RiskStatus;
  mechanism: CorrosionMechanism;
  lastInspection: string;
  nextInspection: string;
  epbExpiryDate: string | null; // Дата окончания ЭПБ (null = отсутствует)
  operatingTempC: number;
  operatingPressureMPa: number;
  mapCoords: { x: number; y: number };
  pipeSegmentId: string;
  measurements: ThicknessPoint[];
  inspections: InspectionRecord[];
}

export const EQUIPMENT_DATA: EquipmentItem[] = [
  {
    id: 'eq-1',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'ТР-102-А',
    name: 'Трубопровод сырой нефти (горячий поток)',
    unit: 'АВТ-3',
    plant: 'Цех №1 (Первичная переработка)',
    type: 'pipeline',
    material: 'Ст. 20 / 09Г2С',
    nominalThickness: 14.0,
    minThickness: 8.5,
    currentThickness: 9.2,
    corrosionRate: 0.78,
    probability: 5,
    consequence: 4,
    status: 'critical',
    mechanism: 'Сульфидная коррозия',
    lastInspection: '2026-04-12',
    nextInspection: '2026-10-15',
    epbExpiryDate: "2026-10-01", // Просрочена
    operatingTempC: 315,
    operatingPressureMPa: 2.4,
    mapCoords: { x: 22, y: 34 },
    pipeSegmentId: 'pipe-1',
    measurements: [
      { date: '2021-05-10', thickness: 13.6 },
      { date: '2022-05-14', thickness: 12.8 },
      { date: '2023-05-20', thickness: 11.9 },
      { date: '2024-05-18', thickness: 10.9 },
      { date: '2025-05-11', thickness: 10.0 },
      { date: '2026-04-12', thickness: 9.2 },
    ],
    inspections: [
      {
        id: 'ins-101',
        date: '2026-04-12',
        inspector: 'Иванов А.С.',
        method: 'УЗТ + ВИК',
        tags: [
          { label: 'Сульфидная коррозия', tone: 'red' },
          { label: 'Риск: Критический', tone: 'red' },
        ],
        findings: 'Локальное утонение стенки на отводе 90°. Рекомендована замена участка в ближайший ППР.',
        defectPhotoLabel: 'Язвенный дефект отвода ТР-102-А (глубина 2.1 мм)',
      },
      {
        id: 'ins-102',
        date: '2025-05-11',
        inspector: 'Петров В.Н.',
        method: 'УЗТ',
        tags: [
          { label: 'Утонение >15%', tone: 'amber' },
          { label: 'Риск: Высокий', tone: 'amber' },
        ],
        findings: 'Зафиксирован рост скорости коррозии до 0.75 мм/год из-за повышения сернистости сырья.',
      },
    ],
  },
  {
    id: 'eq-2',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'Т-204',
    name: 'Теплообменник кубового остатка',
    unit: 'АВТ-3',
    plant: 'Цех №1 (Первичная переработка)',
    type: 'heat_exchanger',
    material: '12Х18Н10Т',
    nominalThickness: 12.0,
    minThickness: 7.0,
    currentThickness: 7.6,
    corrosionRate: 0.62,
    probability: 4,
    consequence: 5,
    status: 'critical',
    mechanism: 'Питтинг',
    lastInspection: '2026-03-05',
    nextInspection: '2026-09-05',
    epbExpiryDate: "2027-02-15", // Просрочена
    operatingTempC: 265,
    operatingPressureMPa: 1.8,
    mapCoords: { x: 42, y: 28 },
    pipeSegmentId: 'pipe-2',
    measurements: [
      { date: '2021-03-10', thickness: 11.4 },
      { date: '2022-03-15', thickness: 10.6 },
      { date: '2023-03-12', thickness: 9.8 },
      { date: '2024-03-20', thickness: 9.0 },
      { date: '2025-03-14', thickness: 8.3 },
      { date: '2026-03-05', thickness: 7.6 },
    ],
    inspections: [
      {
        id: 'ins-201',
        date: '2026-03-05',
        inspector: 'Соколова Е.М.',
        method: 'РК + УЗТ',
        tags: [
          { label: 'Питтинг', tone: 'red' },
          { label: 'Риск: Критический', tone: 'red' },
        ],
        findings: 'Множественные питтинговые язвы на трубной решетке. Остаточный ресурс менее 1 года.',
        defectPhotoLabel: 'Питтинг трубной решетки Т-204',
      },
    ],
  },
  {
    id: 'eq-3',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'К-101',
    name: 'Атмосферная колонна ректификации',
    unit: 'АВТ-3',
    plant: 'Цех №1 (Первичная переработка)',
    type: 'vessel',
    material: '16ГС + плакировка',
    nominalThickness: 24.0,
    minThickness: 16.0,
    currentThickness: 18.8,
    corrosionRate: 0.45,
    probability: 3,
    consequence: 5,
    status: 'warning',
    mechanism: 'Эрозия-коррозия',
    lastInspection: '2026-08-20',
    nextInspection: '2027-02-20',
    epbExpiryDate: "2027-04-10",
    operatingTempC: 340,
    operatingPressureMPa: 0.35,
    mapCoords: { x: 32, y: 55 },
    pipeSegmentId: 'pipe-3',
    measurements: [
      { date: '2021-08-15', thickness: 21.8 },
      { date: '2022-08-18', thickness: 21.1 },
      { date: '2023-08-22', thickness: 20.5 },
      { date: '2024-08-19', thickness: 19.9 },
      { date: '2025-08-25', thickness: 19.3 },
      { date: '2026-08-20', thickness: 18.8 },
    ],
    inspections: [
      {
        id: 'ins-301',
        date: '2026-08-20',
        inspector: 'Иванов А.С.',
        method: 'УЗТ',
        tags: [
          { label: 'Эрозия-коррозия', tone: 'amber' },
          { label: 'Риск: Средний', tone: 'amber' },
        ],
        findings: 'Равномерный износ в зоне ввода шлемового потока. Требуется усиленный контроль.',
      },
    ],
  },
  {
    id: 'eq-4',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'Р-301',
    name: 'Реактор гидроочистки дизельного топлива',
    unit: 'ЛЧ-24/7',
    plant: 'Цех №2 (Гидропроцессы)',
    type: 'reactor',
    material: '15Х5М',
    nominalThickness: 38.0,
    minThickness: 28.0,
    currentThickness: 34.5,
    corrosionRate: 0.22,
    probability: 2,
    consequence: 5,
    status: 'warning',
    mechanism: 'КРН',
    lastInspection: '2026-06-10',
    nextInspection: '2026-11-10',
    epbExpiryDate: null, // Просрочена
    operatingTempC: 385,
    operatingPressureMPa: 4.2,
    mapCoords: { x: 68, y: 38 },
    pipeSegmentId: 'pipe-4',
    measurements: [
      { date: '2021-06-12', thickness: 35.8 },
      { date: '2022-06-15', thickness: 35.5 },
      { date: '2023-06-10', thickness: 35.2 },
      { date: '2024-06-14', thickness: 35.0 },
      { date: '2025-06-11', thickness: 34.7 },
      { date: '2026-06-10', thickness: 34.5 },
    ],
    inspections: [
      {
        id: 'ins-401',
        date: '2026-06-10',
        inspector: 'Кузнецов Д.В.',
        method: 'АЭ + УЗТ',
        tags: [
          { label: 'КРН', tone: 'amber' },
          { label: 'Риск: Средний', tone: 'amber' },
        ],
        findings: 'Микротрещины в зоне сварного шва №4 не выявлены, но требуется повторный контроль АЭ.',
      },
    ],
  },
  {
    id: 'eq-5',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'ТР-408-Б',
    name: 'Линия сброса кислого газа',
    unit: 'ГФУ-2',
    plant: 'Цех №2 (Гидропроцессы)',
    type: 'pipeline',
    material: '09Г2С',
    nominalThickness: 10.0,
    minThickness: 5.5,
    currentThickness: 6.1,
    corrosionRate: 0.55,
    probability: 4,
    consequence: 4,
    status: 'critical',
    mechanism: 'Питтинг',
    lastInspection: '2026-05-22',
    nextInspection: '2026-11-22',
    epbExpiryDate: "2027-01-20", // Просрочена на 1 день
    operatingTempC: 85,
    operatingPressureMPa: 0.9,
    mapCoords: { x: 75, y: 66 },
    pipeSegmentId: 'pipe-5',
    measurements: [
      { date: '2021-05-20', thickness: 9.1 },
      { date: '2022-05-19', thickness: 8.5 },
      { date: '2023-05-25', thickness: 7.8 },
      { date: '2024-05-21', thickness: 7.2 },
      { date: '2025-05-18', thickness: 6.6 },
      { date: '2026-05-22', thickness: 6.1 },
    ],
    inspections: [
      {
        id: 'ins-501',
        date: '2026-05-22',
        inspector: 'Петров В.Н.',
        method: 'УЗТ',
        tags: [
          { label: 'Питтинг', tone: 'red' },
          { label: 'Риск: Высокий', tone: 'red' },
        ],
        findings: 'Сильное локальное утонение в нижней образующей трубы из-за конденсата.',
        defectPhotoLabel: 'Коррозия нижней образующей ТР-408-Б',
      },
    ],
  },
  {
    id: 'eq-6',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'С-105',
    name: 'Сепаратор высокого давления',
    unit: 'ЛЧ-24/7',
    plant: 'Цех №2 (Гидропроцессы)',
    type: 'vessel',
    material: '09Г2С',
    nominalThickness: 20.0,
    minThickness: 13.0,
    currentThickness: 18.2,
    corrosionRate: 0.14,
    probability: 1,
    consequence: 3,
    status: 'normal',
    mechanism: 'Общая коррозия',
    lastInspection: '2026-09-10',
    nextInspection: '2027-09-10',
    epbExpiryDate: "2028-09-10",
    operatingTempC: 60,
    operatingPressureMPa: 3.6,
    mapCoords: { x: 58, y: 62 },
    pipeSegmentId: 'pipe-6',
    measurements: [
      { date: '2021-09-10', thickness: 19.0 },
      { date: '2022-09-12', thickness: 18.8 },
      { date: '2023-09-11', thickness: 18.7 },
      { date: '2024-09-09', thickness: 18.5 },
      { date: '2025-09-14', thickness: 18.4 },
      { date: '2026-09-10', thickness: 18.2 },
    ],
    inspections: [
      {
        id: 'ins-601',
        date: '2026-09-10',
        inspector: 'Соколова Е.М.',
        method: 'УЗТ + ВИК',
        tags: [
          { label: 'Норма', tone: 'green' },
          { label: 'Риск: Низкий', tone: 'green' },
        ],
        findings: 'Состояние корпуса удовлетворительное, скорость коррозии в пределах проектной.',
      },
    ],
  },
  {
    id: 'eq-7',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'ТР-210-В',
    name: 'Паропровод перегретого пара',
    unit: 'ГФУ-2',
    plant: 'Цех №2 (Гидропроцессы)',
    type: 'pipeline',
    material: '12Х1МФ',
    nominalThickness: 11.0,
    minThickness: 6.5,
    currentThickness: 9.8,
    corrosionRate: 0.18,
    probability: 2,
    consequence: 2,
    status: 'normal',
    mechanism: 'Коррозия под изоляцией',
    lastInspection: '2026-07-15',
    nextInspection: '2027-07-15',
    epbExpiryDate: "2028-07-15",
    operatingTempC: 410,
    operatingPressureMPa: 3.1,
    mapCoords: { x: 82, y: 26 },
    pipeSegmentId: 'pipe-7',
    measurements: [
      { date: '2021-07-10', thickness: 10.7 },
      { date: '2022-07-12', thickness: 10.5 },
      { date: '2023-07-14', thickness: 10.3 },
      { date: '2024-07-11', thickness: 10.1 },
      { date: '2025-07-13', thickness: 10.0 },
      { date: '2026-07-15', thickness: 9.8 },
    ],
    inspections: [
      {
        id: 'ins-701',
        date: '2026-07-15',
        inspector: 'Кузнецов Д.В.',
        method: 'ВИК + УЗТ',
        tags: [
          { label: 'CUI (Под изоляцией)', tone: 'blue' },
          { label: 'Риск: Низкий', tone: 'green' },
        ],
        findings: 'Незначительная поверхностная коррозия на участке 12 м. Изоляция восстановлена.',
      },
    ],
  },
  {
    id: 'eq-8',
    plantName: 'ПОЛИЭФ',
    productionName: 'ТФК',
    tag: 'А-201',
    name: 'Абсорбер очистки газа МЭА',
    unit: 'ГФУ-2',
    plant: 'Цех №2 (Гидропроцессы)',
    type: 'vessel',
    material: '09Г2С',
    nominalThickness: 18.0,
    minThickness: 11.5,
    currentThickness: 14.1,
    corrosionRate: 0.36,
    probability: 3,
    consequence: 3,
    status: 'warning',
    mechanism: 'Эрозия-коррозия',
    lastInspection: '2026-09-28',
    nextInspection: '2027-03-28',
    epbExpiryDate: "2027-03-01",
    operatingTempC: 95,
    operatingPressureMPa: 1.4,
    mapCoords: { x: 48, y: 74 },
    pipeSegmentId: 'pipe-8',
    measurements: [
      { date: '2021-09-25', thickness: 16.2 },
      { date: '2022-09-27', thickness: 15.8 },
      { date: '2023-09-29', thickness: 15.4 },
      { date: '2024-09-26', thickness: 15.0 },
      { date: '2025-09-24', thickness: 14.5 },
      { date: '2026-09-28', thickness: 14.1 },
    ],
    inspections: [
      {
        id: 'ins-801',
        date: '2026-09-28',
        inspector: 'Иванов А.С.',
        method: 'УЗТ',
        tags: [
          { label: 'Эрозия-коррозия', tone: 'amber' },
          { label: 'Риск: Средний', tone: 'amber' },
        ],
        findings: 'Умеренный износ в зоне распылителя амина.',
      },
    ],
  },
];

export const TODAY_ISO = '2026-11-23';
