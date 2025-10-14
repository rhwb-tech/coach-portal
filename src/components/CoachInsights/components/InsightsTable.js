import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Download, 
  Table as TableIcon,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { getTableConfig } from '../services/chartConfigs';
import { formatNumber, formatPercentage } from '../utils/chartHelpers';

const InsightsTable = ({ tableData, loading, error, columns }) => {
  const tableConfig = getTableConfig();
  const displayColumns = columns || tableConfig.columns;
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Component for truncated text with hover tooltip
  const TruncatedText = ({ text, maxWords = 5 }) => {
    if (!text || typeof text !== 'string') return '-';
    
    const words = text.split(' ');
    const isTruncated = words.length > maxWords;
    const truncatedText = isTruncated ? words.slice(0, maxWords).join(' ') + '...' : text;

    if (!isTruncated) {
      return <span>{text}</span>;
    }

    return (
      <div className="relative group">
        <span className="cursor-help">{truncatedText}</span>
        <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg max-w-xs break-words -top-2 left-0 transform -translate-y-full">
          <div className="whitespace-pre-wrap">{text}</div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  };

  // Format cell value based on column format
  const formatCellValue = (value, format, columnKey) => {
    if (value === null || value === undefined) return '-';
    
    // Special handling for comment columns - show full text without truncation
    if (columnKey === 'comments' || columnKey === 'rhwb_comments') {
      return <div className="whitespace-pre-wrap break-words">{value}</div>;
    }
    
    switch (format) {
      case 'percentage':
        return formatPercentage(value);
      case 'decimal':
        return formatNumber(value, { decimals: 1 });
      case 'integer':
        return formatNumber(value, { decimals: 0 });
      default:
        return value;
    }
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!Array.isArray(tableData)) return [];

    let filtered = tableData;

    // Filter out rows where both comments and rhwb_comments are null/empty
    filtered = tableData.filter(row => 
      (row.comments && row.comments.trim() !== '') || 
      (row.rhwb_comments && row.rhwb_comments.trim() !== '')
    );

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        // Handle numeric vs string comparison
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
          const result = String(aVal).localeCompare(String(bVal));
          return sortConfig.direction === 'asc' ? result : -result;
        }
      });
    }

    return filtered;
  }, [tableData, searchTerm, sortConfig]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  // Handle column sorting
  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle column visibility toggle
  const toggleColumnVisibility = (columnKey) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (!processedData.length) return;

    const visibleColumns = displayColumns.filter(col => !hiddenColumns.has(col.key));
    const csvHeaders = visibleColumns.map(col => col.label).join(',');
    
    const csvRows = processedData.map(row =>
      visibleColumns.map(col => {
        let value = row[col.key];
        // For comment columns in CSV, use the full text, not the truncated component
        if (col.key === 'comments' || col.key === 'rhwb_comments') {
          value = value || '';
        } else {
          value = formatCellValue(row[col.key], col.format, col.key);
        }
        // Escape commas and quotes in CSV
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `coach-insights-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Get visible columns
  const visibleColumns = displayColumns.filter(col => !hiddenColumns.has(col.key));

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{tableConfig.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{tableConfig.description}</p>
            </div>
            <TableIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{tableConfig.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{tableConfig.description}</p>
            </div>
            <TableIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 text-red-700 mb-2">
              <AlertCircle className="h-5 w-5" />
              <h4 className="font-medium">Error Loading Table Data</h4>
            </div>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6">
        {/* Header - only show if no custom title provided */}
        {!columns && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{tableConfig.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{tableConfig.description}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {processedData.length} records
              </span>
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                disabled={!processedData.length}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        )}


        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && sortConfig.key === column.key && (
                        sortConfig.direction === 'asc' 
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12 text-center">
                    <div className="text-gray-500">
                      <TableIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchTerm ? 'No records match your search criteria' : 'No data available'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {visibleColumns.map((column) => (
                      <td key={column.key} className={`px-4 py-3 text-sm text-gray-900 ${column.key === 'comments' || column.key === 'rhwb_comments' ? 'max-w-none' : ''}`}>
                        {formatCellValue(row[column.key], column.format, column.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 space-y-3 sm:space-y-0">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 3 || 
                    page === currentPage + 3
                  ) {
                    return <span key={page} className="px-2 text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsTable;