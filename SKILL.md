---
name: quiz-patente
description: Архитектурные правила и структура проекта Quiz Patente SPA (iPad mini 2 / Chrome 92)
---

# Quiz Patente — SKILL.md

## Технологический стек
- **Framework**: React (Vite)
- **Target**: iPad mini 2, Chrome 92
- **Стили**: Vanilla CSS + CSS-переменные (NO Tailwind, NO CSS Modules)
- **Legacy поддержка**: `@vitejs/plugin-legacy` с `targets: ['chrome >= 92']`

## Структура проекта

```
src/
├── assets/          # Статические файлы (images, icons)
├── components/      # React-компоненты (PascalCase.jsx)
├── hooks/           # Кастомные хуки (useName.js)
├── pages/           # Страницы (PascalCase.jsx)
├── services/        # Слой данных (nameService.js)
└── styles/
    ├── global.css   # CSS-переменные (:root), сброс стилей
    ├── layout.css   # Сетки, контейнеры, flex-утилиты
    ├── components.css # Атомарные UI-элементы
    └── pages.css    # Уникальные стили страниц
```

## Архитектурный закон (ОБЯЗАТЕЛЕН)

```
Компонент → Хук → Сервис → Данные (localStorage / JSON)
```

- **Запрещено** обращаться к `localStorage`, `fetch`, или JSON напрямую из компонентов/хуков.
- **Все** взаимодействие с данными — только через `src/services/`.

## Правила именования

| Тип          | Стиль       | Пример                 |
|--------------|-------------|------------------------|
| Компонент    | PascalCase  | `QuestionCard.jsx`     |
| Хук          | camelCase   | `useQuiz.js`           |
| Сервис       | camelCase   | `questionsService.js`  |
| CSS-класс    | kebab-case  | `.btn-vero`, `.quiz-container` |
| Папки        | lowercase   | `components/`, `hooks/` |

## Бизнес-логика Quiz

- **Сессия**: всегда 30 случайных вопросов
- **Перевод**: глобальный тоггл сессии (кнопка 🇷🇺) — если включён, показывается на всех вопросах
- **Комментарии**: доступны только после ответа на текущий вопрос
- **Ошибки** (`qp_errors` localStorage):
  - Неправильный ответ → инкрементировать счётчик вопроса
  - Правильный ответ → декрементировать (если 0 — удалить запись)

## CSS-правила

- **Инлайн-стили** — только для динамических значений (ширина прогресс-бара)
- **Цвета** — только через `var(--color-*)` из `global.css`
- **Изображения** — всегда `loading="lazy"` и `alt=""`
- **Vendor prefixes** — `-webkit-` для flex и transform (Chrome 92)
- **Запрещено**: `gap` в flex (используй `margin`), `clamp()`, `aspect-ratio`

## UI / UX

- Кнопки ответа: **VERO** / **FALSO** (итальянский)
- Навигация и подсказки: **русский**
- Фиксированная навигация: `.bottom-nav` (position: fixed; bottom: 0)
- Прогресс: точки (`.dot-nav`) вверху квиза
- Основной фокус — мобильное отображение (max-width: 768px)

## Доступные сервисы (по мере создания)

- `questionsService.js` — загрузка, фильтрация, рандомизация вопросов
- `errorsService.js` — работа с `qp_errors` в localStorage
- `sessionService.js` — управление сессией квиза
- `settingsService.js` — пользовательские настройки (язык, перевод)
