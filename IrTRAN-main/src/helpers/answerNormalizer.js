/**
 * Нормализация ответа для сравнения (свободный ввод).
 * Учитывает: регистр, е/ё, двойные с/н (с и сс, н и нн засчитываются одинаково).
 * @param {string} str
 * @returns {string}
 */
export function normalizeAnswer(str) {
  if (str == null || typeof str !== 'string') return '';
  let s = str.trim().toLowerCase();
  // е и ё считаем одной буквой
  s = s.replace(/ё/g, 'е');
  // Сжимаем последовательности нн / сс до одной буквы,
  // чтобы варианты с одной/двумя этими буквами (с/сс, н/нн)
  // считались эквивалентными: "деревянный" == "деревяный", "классный" == "класный"
  s = s.replace(/нн+/g, 'н');
  s = s.replace(/сс+/g, 'с');
  return s;
}

/**
 * Проверка совпадения свободного ответа с эталоном.
 * @param {string} userAnswer
 * @param {string|string[]} correctAnswer - строка или массив допустимых ответов
 * @returns {boolean}
 */
export function isFreeTextAnswerCorrect(userAnswer, correctAnswer) {
  const normalizedUser = normalizeAnswer(userAnswer);
  if (!normalizedUser) return false;
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some((c) => normalizeAnswer(c) === normalizedUser);
  }
  return normalizedUser === normalizeAnswer(String(correctAnswer));
}
