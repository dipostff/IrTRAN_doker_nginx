/**
 * Нормализация ответа для сравнения (свободный ввод).
 * Учитывает: регистр, е/ё, двойные с/н (с и сс, н и нн засчитываются одинаково).
 * @param {string} str - строка ответа пользователя или эталона
 * @returns {string} - нормализованная строка для сравнения
 */
function normalizeAnswerForComparison(str) {
  if (str == null || typeof str !== 'string') return '';
  let s = str.trim().toLowerCase();
  s = s.replace(/ё/g, 'е');
  s = s.replace(/сс+/g, 'с');
  s = s.replace(/нн+/g, 'н');
  return s;
}

/**
 * Проверка совпадения свободного ответа с эталоном (строка или массив допустимых ответов).
 * @param {string} userAnswer - ответ пользователя
 * @param {string|string[]} correctAnswer - эталон (строка или массив вариантов)
 * @returns {boolean}
 */
function isFreeTextAnswerCorrect(userAnswer, correctAnswer) {
  const normalizedUser = normalizeAnswerForComparison(userAnswer);
  if (!normalizedUser) return false;
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some(
      (c) => normalizeAnswerForComparison(c) === normalizedUser
    );
  }
  return normalizedUser === normalizeAnswerForComparison(String(correctAnswer));
}

module.exports = {
  normalizeAnswerForComparison,
  isFreeTextAnswerCorrect
};
