import React, { useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = "Search patients, prescriptions...", 
  onSearch,
  disabled = false 
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="position-relative">
      <div className="input-group">
        <span className="input-group-text bg-white border-end-0">
          <i className="bi bi-search text-muted"></i>
        </span>
        <input
          type="text"
          className="form-control border-start-0 ps-0"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          style={{
            boxShadow: 'none',
            borderColor: '#dee2e6'
          }}
        />
        {query && (
          <button
            type="button"
            className="btn btn-outline-secondary border-start-0"
            onClick={handleClear}
            style={{ borderColor: '#dee2e6' }}
          >
            <i className="bi bi-x"></i>
          </button>
        )}
      </div>
      {disabled && (
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-light opacity-50 rounded"
             style={{ zIndex: 1 }}>
        </div>
      )}
    </form>
  );
};

export default SearchBar;