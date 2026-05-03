# Quiz Patente — План реализации Learning System Redesign

> Основан на UX Audit & Learning System Redesign.  
> 7 шагов · 3 спринта · от критичного к полировке.

---

## Прогресс

- Sprint 1 (ядро обучения): шаг 1
- Sprint 2 (разбор ошибок): шаги 2–4
- Sprint 3 (полировка): шаги 5–6

---

## Sprint 1 — Ядро обучающего цикла

---

### Шаг 1 — Авто-раскрытие комментария при ошибке + кнопка "Понял → Далее"

- [x] Обновить `handleAnswer` в `QuizPage.jsx` — добавить `setTimeout(150ms)` для раскрытия комментария
- [x] Добавить пропсы `onNext` и `showNextBtn` в `CommentAccordion.jsx`
- [x] Добавить кнопку "Понял → Далее" внутрь `CommentAccordion.jsx`
- [x] Обновить вызов `<CommentAccordion>` в `QuizPage.jsx`
- [x] Добавить CSS-класс `.comment-next-btn`

**Что меняем:**  
При неправильном ответе CommentAccordion раскрывается автоматически через 150ms. Внутри появляется кнопка "Понял → Далее" — единственный способ перейти к следующему вопросу после ошибки. Правильные ответы остаются лёгкими (без принудительных остановок).

**Файл:** `src/pages/QuizPage.jsx` — добавить ветку `else` в `handleAnswer`:

```jsx
// В handleAnswer — добавить ветку else:
} else {
  // Раскрыть комментарий через 150ms (после анимации кнопок)
  setTimeout(() => setShowComment(true), 150);
}
```

**Файл:** `src/components/quiz/CommentAccordion.jsx`:

```jsx
const CommentAccordion = ({
  comment, isVisible, isCorrect,
  onNext,       // новый проп
  showNextBtn   // новый проп
}) => {
  if (!isVisible || !comment) return null;
  // ... существующий JSX без изменений ...

  return (
    <div className={accordionClass}>
      {/* существующий контент без изменений */}
      <div className={`comment-status ...`}>...</div>
      <div className="comment-body">...</div>

      {/* НОВОЕ: кнопка только при ошибке */}
      {showNextBtn && !isCorrect && (
        <button className="comment-next-btn" onClick={onNext}>
          Понял → Далее
        </button>
      )}
    </div>
  );
};
```

**Файл:** `src/pages/QuizPage.jsx` — обновить вызов `<CommentAccordion>`:

```jsx
<CommentAccordion
  comment={currentQuestion.comment}
  isVisible={showComment && (currentAnswer !== undefined || isFinished)}
  isCorrect={isCorrect}
  showNextBtn={true}
  onNext={() => {
    const nextIndex = current + 1 < questions.length ? current + 1 : current;
    handleGoTo(nextIndex);
  }}
/>
```

**Файл:** `src/styles/components.css` — добавить в конец секции CommentAccordion:

```css
.comment-next-btn {
  display: block;
  width: 100%;
  margin-top: var(--spacing-4);
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-wrong);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.comment-next-btn:active {
  opacity: 0.85;
}
```

**Как проверяем:**
- [x] Неправильный ответ → через ~150ms CommentAccordion раскрывается автоматически
- [x] Кнопка "Понял → Далее" видна внутри красного блока
- [x] Клик по кнопке → переход к следующему вопросу
- [x] Правильный ответ → кнопка не появляется
- [x] CommentAccordion при правильном ответе работает как раньше (открывается вручную по 💬)

**Ожидаемый результат:** Ошибка больше не бесследна — объяснение обязательно попадает в поле зрения. Пользователь явно говорит "понял" — осознанное действие вместо пассивного свайпа.

---

## Sprint 2 — Разбор ошибок

---

### Шаг 2 — ResultScreen: передать `questions` и показать разбор ошибок

- [x] Передать `questions={questions}` в `<ResultScreen>` в `QuizPage.jsx`
- [x] Добавить проп `questions` в `ResultScreen.jsx`
- [x] Построить lookup Map внутри `ResultScreen`
- [x] Отрендерить раздел "Ошибки (N)" со списком неправильных вопросов
- [x] Добавить CSS-классы для раздела ошибок

**Что меняем:**  
После завершения теста в ResultScreen появляется список всех ошибок: правильный ответ (VERO/FALSO), текст вопроса (первые 90 символов), первая строка объяснения на русском. Данные уже в памяти — никаких дополнительных запросов.

**Файл:** `src/pages/QuizPage.jsx` — добавить проп:

```jsx
<ResultScreen
  results={results}
  questions={questions}   {/* ← НОВОЕ */}
  total={questions.length}
  topicId={topicId}
  onRestart={() => { reset(); setShowResults(false); }}
  onClose={() => setShowResults(false)}
  onFinish={() => navigate(backPath)}
/>
```

**Файл:** `src/components/quiz/ResultScreen.jsx`:

```jsx
const ResultScreen = ({ results, questions = [], total, topicId,
                        onRestart, onClose, onFinish }) => {
  const correctCount = results.filter(r => r.correct).length;
  const wrongCount = total - correctCount;
  const scorePercent = Math.round((correctCount / total) * 100);
  const isPassed = wrongCount <= 4;

  // Lookup map для быстрого доступа к вопросам по id
  const qMap = questions.reduce((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {});

  const wrongResults = results.filter(r => !r.correct);

  return (
    <div className="result-screen">
      <div className="result-screen__container">

        {/* === Существующий блок без изменений === */}
        {/* ... h2, subtitle, stats, actions ... */}

        {/* === НОВОЕ: разбор ошибок === */}
        {wrongResults.length > 0 && (
          <div className="result-errors">
            <div className="result-errors__title">
              Ошибки ({wrongResults.length})
            </div>
            {wrongResults.map(r => {
              const q = qMap[r.questionId];
              if (!q) return null;
              const preview = q.text.length > 90
                ? q.text.slice(0, 90) + '…'
                : q.text;
              const commentPreview = q.comment?.text_ru
                ? (q.comment.text_ru.length > 70
                    ? q.comment.text_ru.slice(0, 70) + '…'
                    : q.comment.text_ru)
                : null;
              return (
                <div key={r.questionId} className="result-error-item">
                  <div className="result-error-item__answer">
                    {q.answer ? 'VERO' : 'FALSO'}
                  </div>
                  <div className="result-error-item__body">
                    <p className="result-error-item__text">{preview}</p>
                    {commentPreview && (
                      <p className="result-error-item__comment">
                        {commentPreview}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Файл:** `src/styles/pages.css` — добавить после `.result-screen__action-button`:

```css
.result-errors {
  margin-top: var(--spacing-6);
  text-align: left;
}
.result-errors__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-wrong);
  margin-bottom: var(--spacing-3);
}
.result-error-item {
  display: -webkit-flex;
  display: flex;
  margin-bottom: var(--spacing-3);
  padding: var(--spacing-3);
  background-color: var(--color-wrong-bg);
  border: 1px solid var(--color-wrong-border);
  border-radius: var(--radius-md);
}
.result-error-item__answer {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-correct);
  width: 44px;
  padding-top: 2px;
}
.result-error-item__body { flex: 1; min-width: 0; }
.result-error-item__text {
  font-size: var(--font-size-xs);
  color: var(--color-text);
  margin: 0 0 var(--spacing-1) 0;
  line-height: 1.4;
}
.result-error-item__comment {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  font-style: italic;
}
```

**Как проверяем:**
- [x] После VERIFICA с ошибками: в ResultScreen виден раздел "Ошибки (N)"
- [x] Каждая ошибка: правильный ответ слева (зелёный VERO/FALSO), текст вопроса, первая строка объяснения
- [x] Если все 30 правильно: раздел ошибок не рендерится
- [x] Нет дополнительных fetch-запросов (данные уже в памяти)

**Ожидаемый результат:** Error correction loop замкнут прямо в сессии — не надо идти в /errors. Ошибки свежи в памяти → разбор максимально эффективен.

---

### Шаг 3 — Per-question перевод вместо глобального

- [x] Убрать `globalTranslation` (useState) из `QuizPage.jsx`
- [x] Убрать старый `handleToggleTranslation`
- [x] Добавить `translatedQuestions` (Set) в `QuizPage.jsx`
- [x] Написать новый `handleToggleTranslation` — добавляет/удаляет id из Set
- [x] Обновить `showTranslation` в JSX: `translatedQuestions.has(currentQuestion.id)`

**Что меняем:**  
Вместо одного глобального флага перевода — Set с id вопросов, для которых включён перевод. Перевод на вопросе 3 не влияет на вопрос 4. При возврате к вопросу 3 — перевод снова включён.

**Файл:** `src/pages/QuizPage.jsx`:

```jsx
// УБРАТЬ:
// const [globalTranslation, setGlobalTranslation] = useState(false);
// const handleToggleTranslation = useCallback(() => {
//   setGlobalTranslation(prev => !prev);
// }, []);

// ДОБАВИТЬ:
const [translatedQuestions, setTranslatedQuestions] = useState(() => new Set());

const handleToggleTranslation = useCallback(() => {
  const qId = questions[current]?.id;
  if (!qId) return;
  setTranslatedQuestions(prev => {
    const next = new Set(prev);
    if (next.has(qId)) {
      next.delete(qId);
    } else {
      next.add(qId);
    }
    return next;
  });
}, [questions, current]);

// При передаче пропса QuestionCard — вычислить локально:
const showTranslation = translatedQuestions.has(currentQuestion.id);
// showTranslation={showTranslation} — проп уже есть, просто обновляем источник
```

**Как проверяем:**
- [x] Включить перевод на вопросе 3 → перейти к вопросу 4 → перевод выключен
- [x] Вернуться к вопросу 3 → перевод снова включён
- [x] Кнопка 🇷🇺 показывает `action-icon--active` только когда перевод открыт для текущего вопроса

**Ожидаемый результат:** Пользователь использует перевод точечно для сложных вопросов. Устраняется "режим костыля" когда перевод включён на весь тест.

---

### Шаг 4 — Счётчик повторных ошибок в разборе ResultScreen

- [ ] Импортировать `getErrors` из `errorsService` в `ResultScreen.jsx`
- [ ] Вызвать `getErrors()` один раз при рендере
- [ ] Добавить метку "⚠ N-я ошибка" в карточку если `errCount > 1`
- [ ] Добавить CSS `.result-error-item__repeat`

**Что меняем:**  
В разделе ошибок ResultScreen рядом с каждым вопросом появляется метка если пользователь ошибался на нём больше одного раза. `getErrors()` — синхронный вызов localStorage, нет нагрузки.

**Файл:** `src/components/quiz/ResultScreen.jsx`:

```jsx
import { getErrors } from '../../services/errorsService';

// Внутри компонента (после qMap):
const errorCounts = getErrors(); // { "78": 2, "245": 3, ... }

// Внутри wrongResults.map() — добавить:
const errCount = errorCounts[String(r.questionId)] || 0;

// В JSX карточки ошибки — добавить под .result-error-item__answer:
{errCount > 1 && (
  <span className="result-error-item__repeat">
    ⚠ {errCount}-я ошибка
  </span>
)}
```

**Файл:** `src/styles/pages.css` — добавить рядом с `.result-error-item__answer`:

```css
.result-error-item__repeat {
  font-size: 11px;
  color: var(--color-wrong);
  font-weight: var(--font-weight-bold);
  display: block;
  margin-top: var(--spacing-1);
}
```

**Как проверяем:**
- [ ] Ошибиться на одном вопросе 2+ раза → в ResultScreen видна метка "⚠ N-я ошибка"
- [ ] Первая ошибка → метка не появляется (`errCount === 1` → нет метки)
- [ ] Нет дополнительных fetch-запросов

**Ожидаемый результат:** Пользователь осознаёт паттерн — "я систематически ошибаюсь на этом вопросе". Создаёт мотивацию уделить ему особое внимание.

---

## Sprint 3 — Полировка

> Шаги 5 и 6 независимы, делать в любом порядке. Нулевые риски.

---

### Шаг 5 — Скрыть кнопку 💬 до ответа (вместо disabled)

- [ ] Обернуть кнопку комментария в условный рендер в `QuestionCard.jsx`
- [ ] Убрать проп `disabled` с кнопки

**Что меняем:**  
Кнопка комментария раньше: всегда видна, `disabled` до ответа (тихо игнорирует нажатие, пользователь не понимает почему). Станет: вообще не рендерится до ответа. После ответа — появляется. Это визуальный сигнал "теперь доступно объяснение".

**Файл:** `src/components/quiz/QuestionCard.jsx`:

```jsx
// БЫЛО:
<button
  className={'action-icon' + (showComment ? ' action-icon--active' : '')}
  onClick={onToggleComment}
  disabled={currentAnswer === undefined && !isSessionFinished}
  title="Показать комментарий"
>
  <Icon name="comment" size={30} />
</button>

// СТАЛО:
{(currentAnswer !== undefined || isSessionFinished) && (
  <button
    className={'action-icon' + (showComment ? ' action-icon--active' : '')}
    onClick={onToggleComment}
    title="Показать комментарий"
  >
    <Icon name="comment" size={30} />
  </button>
)}
```

**Как проверяем:**
- [ ] До ответа: кнопка 💬 отсутствует в DOM
- [ ] После ответа: кнопка 💬 появляется
- [ ] Кнопка 🇷🇺 (перевод) остаётся видимой всегда — логика не затронута

**Ожидаемый результат:** Устраняется "тихий disabled". Появление кнопки после ответа — чёткий визуальный сигнал.

---

### Шаг 6 — Исправить текст ConfirmationModal + счётчик вопросов

- [ ] Исправить `message` в `<ConfirmationModal>` в `QuizPage.jsx`
- [ ] Добавить `<div className="quiz-counter">` под `<QuizPagination>`
- [ ] Добавить CSS `.quiz-counter`

**Что меняем:**  
Текст модального окна выхода пугал словом "потерян" — хотя отметки ошибок уже записаны в `qp_errors` к этому моменту. Исправляем на честный текст. Добавляем счётчик "Вопрос X из 30 · отвечено N" под пагинацией — снижает тревогу без необходимости считать кружки.

**Файл:** `src/pages/QuizPage.jsx`:

```jsx
// ConfirmationModal — исправить message:
// БЫЛО:
message="Вы уверены, что хотите покинуть квиз? Ваш прогресс в этой сессии будет потерян."
// СТАЛО:
message="Выйти из теста? Отметки ошибок уже сохранены. Результаты этой сессии не зачтутся."

// Добавить под <QuizPagination>:
<div className="quiz-counter">
  Вопрос {current + 1} из {questions.length}
  {answered.size > 0 && ` · отвечено ${answered.size}`}
</div>
```

**Файл:** `src/styles/pages.css` — добавить:

```css
.quiz-counter {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--spacing-1) 0 var(--spacing-2);
}
```

**Как проверяем:**
- [ ] При попытке выхода: новый текст модального окна без слова "потерян"
- [ ] Под пагинацией виден счётчик "Вопрос 5 из 30 · отвечено 4"
- [ ] Счётчик обновляется при навигации и при ответах

**Ожидаемый результат:** Честный текст — пользователь не боится выйти напрасно. Счётчик снижает тревогу "сколько ещё осталось".

---

## Сводная таблица изменений по файлам

| Файл | Шаги | Тип изменения |
|---|---|---|
| `src/pages/QuizPage.jsx` | 1, 2, 3, 6 | Правка |
| `src/components/quiz/CommentAccordion.jsx` | 1 | Правка |
| `src/components/quiz/ResultScreen.jsx` | 2, 4 | Правка |
| `src/components/quiz/QuestionCard.jsx` | 5 | Правка |
| `src/styles/components.css` | 1 | Добавление стилей |
| `src/styles/pages.css` | 2, 4, 6 | Добавление стилей |

> Итого: 0 новых файлов, 4 компонента с правками, 2 CSS-файла с добавлениями.  
> Сервисный слой (`services/`) не трогаем. Архитектурный закон не нарушается.
