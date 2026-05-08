// components/SearchBar.tsx
'use client';

import { useState } from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
    const data = await res.json();
    if (!data._error) setResults(data.payload.results);
    setIsOpen(true);
  };

  return (
    <div className={styles.wrapper}>
      <input
        type="search"
        className={styles.input}
        placeholder="메시지, 번역 검색..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((r) => (
            <div key={r.id} className={styles.item}>
              <span className={styles.type}>{r.type === 'message' ? '💬' : '📖'}</span>
              <div>
                <p className={styles.title}>{r.title}</p>
                <p className={styles.snippet}>{r.snippet}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}