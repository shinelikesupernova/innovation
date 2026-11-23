/**
 * Модуль инженерных расчетов коррозионной деградации и остаточного ресурса (СППР)
 */

export interface ThicknessPoint {
  date: string; // YYYY-MM-DD
  thickness: number; // мм
}

export interface RemainingLifeResult {
  remainingLifeYears: number;
  projectedFailureDate: string | null; // YYYY-MM-DD или null, если коррозия отсутствует
  isCritical: boolean;
  wallLossPercent: number;
}

/**
 * Расчет остаточного ресурса (Remaining Life) на основе текущей толщины,
 * минимально допустимой толщины (t_min) и скорости коррозии (Corrosion Rate).
 *
 * Формула API 510 / API 570:
 *   RL = (t_actual - t_min) / CR
 *
 * @param currentThickness Текущая толщина стенки (мм)
 * @param minThickness Минимально допустимая толщина t_min (мм)
 * @param corrosionRate Скорость коррозии (мм/год)
 * @param nominalThickness Номинальная толщина стенки (мм)
 * @param referenceDate Базовая дата расчета (по умолчанию текущая)
 */
export function calculateRemainingLife(
  currentThickness: number,
  minThickness: number,
  corrosionRate: number,
  nominalThickness: number,
  referenceDate: Date = new Date()
): RemainingLifeResult {
  const safeAllowance = Math.max(0, nominalThickness - minThickness);
  const lostThickness = Math.max(0, nominalThickness - currentThickness);
  const wallLossPercent =
    safeAllowance > 0 ? Math.min(100, Math.round((lostThickness / safeAllowance) * 100)) : 100;

  if (currentThickness <= minThickness) {
    return {
      remainingLifeYears: 0,
      projectedFailureDate: referenceDate.toISOString().split('T')[0],
      isCritical: true,
      wallLossPercent: 100,
    };
  }

  if (corrosionRate <= 0.0001) {
    return {
      remainingLifeYears: 99.9,
      projectedFailureDate: null,
      isCritical: false,
      wallLossPercent,
    };
  }

  const remainingYears = (currentThickness - minThickness) / corrosionRate;
  const roundedYears = Math.max(0, Number(remainingYears.toFixed(2)));

  const failureDate = new Date(referenceDate);
  failureDate.setDate(failureDate.getDate() + Math.round(roundedYears * 365.25));

  return {
    remainingLifeYears: roundedYears,
    projectedFailureDate: failureDate.toISOString().split('T')[0],
    isCritical: roundedYears < 2.0,
    wallLossPercent,
  };
}

/**
 * Линейная регрессия (метод наименьших квадратов) для построения
 * прогноза деградации стенки и определения даты пересечения с t_min.
 */
export function calculateDegradationForecast(
  points: ThicknessPoint[],
  minThickness: number,
  forecastYears: number = 5
) {
  if (points.length < 2) {
    return {
      slopePerYear: 0,
      forecastPoints: points.map((p) => ({ ...p, predicted: p.thickness })),
      intersectionDate: null as string | null,
    };
  }

  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const t0 = new Date(sorted[0].date).getTime();
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;

  const xs = sorted.map((p) => (new Date(p.date).getTime() - t0) / msPerYear);
  const ys = sorted.map((p) => p.thickness);

  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Точка пересечения линии регрессии с t_min
  let intersectionDate: string | null = null;
  if (slope < -0.001) {
    const yearsFromT0 = (minThickness - intercept) / slope;
    if (yearsFromT0 > 0 && yearsFromT0 < 50) {
      const failMs = t0 + yearsFromT0 * msPerYear;
      intersectionDate = new Date(failMs).toISOString().split('T')[0];
    }
  }

  const lastX = xs[xs.length - 1];
  const chartData: Array<{
    date: string;
    actual?: number;
    forecast?: number;
  }> = sorted.map((p, idx) => ({
    date: p.date,
    actual: p.thickness,
    forecast: Number((slope * xs[idx] + intercept).toFixed(2)),
  }));

  // Добавляем прогнозные точки вперед
  for (let y = 1; y <= forecastYears; y++) {
    const futureX = lastX + y;
    const futureDate = new Date(t0 + futureX * msPerYear).toISOString().split('T')[0];
    const predictedVal = Math.max(0, Number((slope * futureX + intercept).toFixed(2)));
    chartData.push({
      date: futureDate,
      forecast: predictedVal,
    });
    if (predictedVal <= minThickness) break;
  }

  return {
    slopePerYear: Number(Math.abs(slope).toFixed(3)),
    forecastPoints: chartData,
    intersectionDate,
  };
}

/**
 * Определение цвета ячейки матрицы рисков 5x5
 * Ось X: Вероятность (1..5), Ось Y: Тяжесть последствий (1..5)
 */
export function getRiskMatrixLevel(
  probability: number,
  consequence: number
): 'low' | 'medium' | 'high' | 'critical' {
  const score = probability * consequence;
  if (score >= 15) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}
