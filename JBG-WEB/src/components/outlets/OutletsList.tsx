import { useCallback, useEffect, useState } from "react";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { Outlet } from "../../types/outlet";
import outletService from "../../services/outletService";

interface OutletsListProps {
  onEditOutlet: (outlet: Outlet) => void;
  onDeleteOutlet: (outlet: Outlet) => void;
  searchQuery?: string;
  refreshKey?: number;
}

const OutletsList: React.FC<OutletsListProps> = ({
  onEditOutlet,
  onDeleteOutlet,
  searchQuery = '',
  refreshKey = 0,
}) => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAddresses, setExpandedAddresses] = useState<Set<number>>(new Set());

  // Filter outlets based on search query
  const filteredOutlets = outlets.filter(outlet => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      outlet.name.toLowerCase().includes(query) ||
      outlet.mobile.toLowerCase().includes(query) ||
      outlet.email?.toLowerCase().includes(query) ||
      outlet.address.toLowerCase().includes(query) ||
      outlet.gst_no?.toLowerCase().includes(query) ||
      outlet.pan_no?.toLowerCase().includes(query)
    );
  });

  const fetchOutlets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching outlets...');
      console.log('Auth token in localStorage:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');
      const data = await outletService.getOutlets();
      console.log('Outlets fetched successfully:', data);
      setOutlets(data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch outlets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets, refreshKey]);

  const handleRefresh = () => {
    fetchOutlets();
  };

  const toggleAddressExpansion = (outletId: number) => {
    setExpandedAddresses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outletId)) {
        newSet.delete(outletId);
      } else {
        newSet.add(outletId);
      }
      return newSet;
    });
  };

  const truncateAddress = (address: string, maxLength: number = 50) => {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading outlets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No outlets found</div>
          <p className="text-gray-500 mb-4">No outlets are currently registered in the system.</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (filteredOutlets.length === 0 && searchQuery) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No matching outlets found</div>
          <p className="text-gray-500 mb-4">No outlets match your search criteria for "{searchQuery}".</p>
          <p className="text-sm text-gray-400">Try different search terms or clear the search to see all outlets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredOutlets.map((outlet) => (
        <div
          key={outlet.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200 dark:border-gray-700"
        >
          {/* Logo */}
          <div className="flex justify-center mb-4">
            {outlet.logo ? (
              <img
                src={outlet.logo}
                alt={`${outlet.name} logo`}
                className="w-16 h-16 object-cover rounded-full border-2 border-gray-200 dark:border-gray-600"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const placeholder = img.parentElement?.querySelector('.logo-placeholder');
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div
              className={`w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center logo-placeholder ${
                outlet.logo ? 'hidden' : 'flex'
              }`}
            >
              <span className="text-gray-400 text-xl font-semibold">
                {outlet.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Outlet Information */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate" title={outlet.name}>
              {outlet.name}
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-center text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-2 text-center max-w-full">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    {expandedAddresses.has(outlet.id) ? (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                        <p 
                          className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          onClick={() => toggleAddressExpansion(outlet.id)}
                          title="Click to collapse address"
                        >
                          {outlet.address}
                        </p>
                      </div>
                    ) : (
                      <p 
                        className="text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        onClick={() => toggleAddressExpansion(outlet.id)}
                        title={outlet.address}
                      >
                        {truncateAddress(outlet.address)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.open(`tel:${outlet.country_code}${outlet.mobile}`, '_self')}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Call this outlet"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => window.open(`https://wa.me/${outlet.country_code.replace('+', '')}${outlet.mobile}`, '_blank')}
                    className="flex items-center gap-1 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="Message on WhatsApp"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                  </button>
                  
                  <span className="text-sm">{outlet.country_code} {outlet.mobile}</span>
                </div>
              </div>
              
              {outlet.email && (
                <div className="flex items-center justify-center text-gray-600 dark:text-gray-300">
                  <a
                    href={`mailto:${outlet.email}`}
                    className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Send email"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate max-w-full">{outlet.email}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onEditOutlet(outlet)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              title="Edit outlet"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
            
            <button
              onClick={() => onDeleteOutlet(outlet)}
              className="flex items-center justify-center p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-lg transition-colors duration-200"
              title="Delete outlet"
            >
              <TrashBinIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Additional Info Badge */}
          {outlet.bank_details.length > 0 && (
            <div className="mt-3 flex justify-center">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                {outlet.bank_details.length} Bank Account{outlet.bank_details.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default OutletsList;
