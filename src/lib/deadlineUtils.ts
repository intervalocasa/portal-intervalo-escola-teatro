/**
 * Utilitários para controle de prazos mensais de entrega de diários e autoavaliações.
 */

export interface MonthlyDeadlineInfo {
  referenceMonth: number;
  referenceYear: number;
  monthName: string;
  deadlineDay: number;
  deadlineMonth: number;
  deadlineYear: number;
  deadlineDate: Date;
  isExpired: boolean;
  formattedDeadline: string;
  formattedReference: string;
  daysRemaining: number;
}

/**
 * Calcula o prazo limite para um mês/ano de referência (até às 23:59:59 do dia 05 do mês seguinte).
 * Ex: Mês 8 (Agosto) / 2026 -> Prazo: 05/09/2026 às 23:59:59.
 * Ex: Mês 12 (Dezembro) / 2026 -> Prazo: 05/01/2027 às 23:59:59.
 */
export function getMonthlyDeadline(
  month: number, 
  year: number, 
  deadlineDay: number = 5,
  now: Date = new Date()
): MonthlyDeadlineInfo {
  const safeMonth = Math.min(Math.max(Number(month) || 1, 1), 12);
  const safeYear = Number(year) || now.getFullYear();

  // Mês seguinte
  const deadlineMonth = safeMonth === 12 ? 1 : safeMonth + 1;
  const deadlineYear = safeMonth === 12 ? safeYear + 1 : safeYear;

  // Fim do dia 05 do mês seguinte (23:59:59.999)
  const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, deadlineDay, 23, 59, 59, 999);

  const isExpired = now.getTime() > deadlineDate.getTime();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const pad = (n: number) => String(n).padStart(2, "0");
  const formattedDeadline = `${pad(deadlineDay)}/${pad(deadlineMonth)}/${deadlineYear}`;

  const monthDate = new Date(safeYear, safeMonth - 1, 1);
  const rawMonthName = monthDate.toLocaleDateString("pt-BR", { month: "long" });
  const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);
  const formattedReference = `${monthName}/${safeYear}`;

  return {
    referenceMonth: safeMonth,
    referenceYear: safeYear,
    monthName,
    deadlineDay,
    deadlineMonth,
    deadlineYear,
    deadlineDate,
    isExpired,
    formattedDeadline,
    formattedReference,
    daysRemaining
  };
}
