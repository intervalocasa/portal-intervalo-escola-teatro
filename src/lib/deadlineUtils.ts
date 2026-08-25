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

export interface ClassDiaryDeadlineInfo {
  classDate: string;
  classTime?: string;
  classEndDateTime: Date;
  deadlineDate: Date;
  isExpired: boolean;
  hoursRemaining: number;
  hoursExpired: number;
  formattedClassEnd: string;
  formattedDeadline: string;
  formattedTimeRemaining: string;
}

/**
 * Calcula o prazo de 24 horas para lançamento de frequência e relato de aula pelo professor.
 * @param classDateStr Data da aula no formato YYYY-MM-DD
 * @param classTimeStr Horário da aula (ex: "19:00 - 22:00" ou "19:00")
 * @param now Data atual
 */
export function getClassDiaryDeadlineInfo(
  classDateStr: string,
  classTimeStr: string = "",
  now: Date = new Date()
): ClassDiaryDeadlineInfo {
  if (!classDateStr) {
    const fallbackDate = new Date();
    return {
      classDate: "",
      classTime: classTimeStr,
      classEndDateTime: fallbackDate,
      deadlineDate: fallbackDate,
      isExpired: false,
      hoursRemaining: 24,
      hoursExpired: 0,
      formattedClassEnd: "",
      formattedDeadline: "",
      formattedTimeRemaining: "24h restantes"
    };
  }

  const [yearStr, monthStr, dayStr] = classDateStr.split("-");
  const year = parseInt(yearStr) || now.getFullYear();
  const month = (parseInt(monthStr) || (now.getMonth() + 1)) - 1;
  const day = parseInt(dayStr) || now.getDate();

  let endHour = 22; // Padrão se não informado: fim da noite
  let endMinute = 0;

  if (classTimeStr && typeof classTimeStr === "string") {
    const cleanTime = classTimeStr.trim();
    // Ex: "19:00 - 22:00" -> pegar a parte depois do '-' se existir
    if (cleanTime.includes("-")) {
      const parts = cleanTime.split("-");
      const endTimePart = parts[1].trim();
      const match = endTimePart.match(/(\d{1,2})[:hH](\d{2})?/);
      if (match) {
        endHour = parseInt(match[1]);
        endMinute = match[2] ? parseInt(match[2]) : 0;
      }
    } else {
      // Ex: "19:00" -> adicionar 2 horas de duração média de aula
      const match = cleanTime.match(/(\d{1,2})[:hH](\d{2})?/);
      if (match) {
        const startH = parseInt(match[1]);
        const startM = match[2] ? parseInt(match[2]) : 0;
        endHour = Math.min(23, startH + 2);
        endMinute = startM;
      }
    }
  }

  // Data e hora de encerramento da aula
  const classEndDateTime = new Date(year, month, day, endHour, endMinute, 0, 0);

  // Prazo limite: exatamente 24 horas após o término da aula
  const deadlineDate = new Date(classEndDateTime.getTime() + 24 * 60 * 60 * 1000);

  const diffMs = deadlineDate.getTime() - now.getTime();
  const isExpired = diffMs < 0;

  const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

  const hoursExpired = Math.max(0, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60)));

  const pad = (n: number) => String(n).padStart(2, "0");

  const formattedClassEnd = `${pad(day)}/${pad(month + 1)}/${year} às ${pad(endHour)}:${pad(endMinute)}`;
  const formattedDeadline = `${pad(deadlineDate.getDate())}/${pad(deadlineDate.getMonth() + 1)}/${deadlineDate.getFullYear()} às ${pad(deadlineDate.getHours())}:${pad(deadlineDate.getMinutes())}`;

  let formattedTimeRemaining = "";
  if (isExpired) {
    formattedTimeRemaining = hoursExpired > 24 
      ? `Expirado há ${Math.floor(hoursExpired / 24)} dia(s)`
      : `Expirado há ${hoursExpired}h`;
  } else {
    formattedTimeRemaining = hoursRemaining > 0 
      ? `${hoursRemaining}h ${minutesRemaining}m restantes`
      : `${minutesRemaining}m restantes`;
  }

  return {
    classDate: classDateStr,
    classTime: classTimeStr,
    classEndDateTime,
    deadlineDate,
    isExpired,
    hoursRemaining,
    hoursExpired,
    formattedClassEnd,
    formattedDeadline,
    formattedTimeRemaining
  };
}
