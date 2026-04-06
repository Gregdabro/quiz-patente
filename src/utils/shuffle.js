/**
 * shuffle.js — перемешивание массива (алгоритм Фишера-Йейтса)
 * Возвращает новый перемешанный массив, не мутирует оригинал.
 */
export function shuffle(array) {
  var result = array.slice();
  var i = result.length;
  while (i > 0) {
    var j = Math.floor(Math.random() * i);
    i--;
    var temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
