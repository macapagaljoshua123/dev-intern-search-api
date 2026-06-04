import React, { useState } from 'react';
import axios from 'axios';
import SearchResults from './SearchResults';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setProviderUsed(null);

    try {
      const response = await axios.get('http://127.0.0.1:8000/search', {
        params: { q: query, max_results: 20 }
      });

      if (response.data.results) {
        setResults(response.data.results);
        setProviderUsed(response.data.provider_used);
      } else if (response.data.error) {
        setError(response.data.error);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.detail || 'Failed to search. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <header className="search-header">
        <h1>🔍 Free Web Search</h1>
        <p>Search the web - no API key required | Powered by DuckDuckGo + Marginalia</p>
      </header>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your search query..."
          className="search-input"
          disabled={loading}
        />
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {providerUsed && results.length > 0 && (
        <div className="provider-info">
          ⚡ Results from: <strong>{providerUsed}</strong>
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <SearchResults results={results} loading={loading} query={query} />
    </div>
  );
};

export default SearchPage;