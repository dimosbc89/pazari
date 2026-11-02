import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n';
import { Icon } from './Icons';

interface Props {
  defaultValue?: string;
  size?: 'lg' | 'md';
  autoFocus?: boolean;
  /** Called on every keystroke with the current text (the home carts use its length). */
  onType?: (value: string) => void;
}

/** Search box. Submitting goes to the results page; filters reset on a new search. */
export function SearchInput({ defaultValue = '', size = 'md', autoFocus, onType }: Props) {
  const { t, path } = useLocale();
  const navigate = useNavigate();
  const [value, setValue] = useState(defaultValue);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => setValue(defaultValue), [defaultValue]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    navigate(`${path('/products')}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    input.current?.blur();
  };

  return (
    <form className={`search search--${size}`} role="search" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">{t('search.label')}</label>
      <Icon name="search" className="search-icon" />
      <input
        ref={input}
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={t('search.placeholder')}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => { setValue(e.target.value); onType?.(e.target.value); }}
      />
      {value && (
        <button type="button" className="search-clear" aria-label={t('search.clear')}
          onClick={() => { setValue(''); onType?.(''); input.current?.focus(); }}>
          <Icon name="close" />
        </button>
      )}
      <button type="submit" className="btn search-submit" aria-label={t('search.button')}>
        <Icon name="search" className="search-submit-icon" />
        <span className="search-submit-text">{t('search.button')}</span>
      </button>
    </form>
  );
}
