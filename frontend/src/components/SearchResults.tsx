import React from 'react';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, loading, query }) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Searching for "{query}"...</p>
      </div>
    );
  }

  if (results.length === 0 && !loading && query) {
    return (
      <div className="no-results">
        <p>No results found for "{query}"</p>
        <p>Try a different search term.</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="welcome-message">
        <p>✨ Welcome! Enter a search query above to get started.</p>
        <p>Example searches:</p>
        <ul>
          <li>What is photosynthesis?</li>
          <li>Albert Einstein biography</li>
          <li>Machine learning basics</li>
          <li>Latest AI news</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="results-container">
      <p className="results-count">Found {results.length} results</p>
      {results.map((result, index) => (
        <div key={index} className="result-card">
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-title">
            {result.title || 'Untitled'}
          </a>
          <div className="result-url">{result.url}</div>
          <p className="result-snippet">{result.snippet || 'No description available'}</p>
          <span className="result-source">📄 {result.source}</span>
        </div>
      ))}
    </div>
  );
};

export default SearchResults;