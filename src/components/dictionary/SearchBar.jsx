import React, { useState, useEffect, useRef } from 'react';
import Icon from '../ui/Icon';

/**
 * Поисковая строка для словаря с debounce.
 *
 * @param {string}   value       — текущее значение (управляемый компонент)
 * @param {Function} onChange    — вызывается через 300ms после последнего ввода
 * @param {string}   placeholder — текст-заглушка
 */
const SearchBar = React.memo(function SearchBar({ value, onChange, placeholder = 'Поиск термина...' }) {
  // Локальный стейт для мгновенного отображения текста в input,
  // onChange вызывается с debounce
  const [localValue, setLocalValue] = useState(value || '');
  const timerRef = useRef(null);

  // Синхронизация если внешний value изменился (например, очистка из родителя)
  useEffect(function () {
    setLocalValue(value || '');
  }, [value]);

  function handleChange(e) {
    var val = e.target.value;
    setLocalValue(val);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(function () {
      onChange(val);
    }, 300);
  }

  function handleClear() {
    setLocalValue('');
    clearTimeout(timerRef.current);
    onChange('');
  }

  // Очищаем таймер при размонтировании
  useEffect(function () {
    return function () {
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="dict-search">
      <span className="dict-search__icon">
        <Icon name="search" size={18} color="var(--color-text-muted)" />
      </span>
      <input
        className="dict-search__input"
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      {localValue.length > 0 && (
        <button className="dict-search__clear" onClick={handleClear} type="button" aria-label="Очистить поиск">
          <Icon name="x" size={16} color="var(--color-text-muted)" />
        </button>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
