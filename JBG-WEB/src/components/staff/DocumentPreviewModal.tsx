import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { API_URLS, CURRENT_ENV } from '../../utils/apiConstants';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  documentUrl: string | null;
  documentName?: string;
  onClose: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  documentUrl,
  documentName,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other' | null>(null);

  // Convert relative URL to absolute URL with backend domain
  const getAbsoluteUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url; // Already absolute
    }
    if (url.startsWith('/')) {
      // Relative URL - append to backend domain
      const apiUrl = API_URLS[CURRENT_ENV];
      // Remove /api from the end to get the base URL
      const baseUrl = apiUrl.replace('/api', '');
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const absoluteDocumentUrl = getAbsoluteUrl(documentUrl);

  useEffect(() => {
    if (!absoluteDocumentUrl) {
      setFileType(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Determine file type from URL
    const extension = absoluteDocumentUrl.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      setFileType('image');
      setLoading(false);
    } else if (extension === 'pdf') {
      setFileType('pdf');
      setLoading(false);
    } else {
      setFileType('other');
      setLoading(false);
    }
  }, [absoluteDocumentUrl]);

  const getFileName = () => {
    if (documentName) return documentName;
    if (!absoluteDocumentUrl) return 'Document';
    return absoluteDocumentUrl.split('/').pop() || 'Document';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl m-4">
      <div className="relative w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-0 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-3xl sticky top-0">
          <div className="flex items-center gap-3 min-w-0">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
            </svg>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {getFileName()}
            </h4>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-2">Error Loading Document</div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              </div>
            </div>
          ) : fileType === 'image' ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-full max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <img
                  src={absoluteDocumentUrl || ''}
                  alt={getFileName()}
                  className="max-w-full h-auto"
                  onError={() => setError('Failed to load image')}
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Image Preview
              </div>
            </div>
          ) : fileType === 'pdf' ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-full max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-4">
                <iframe
                  src={absoluteDocumentUrl || ''}
                  className="w-full h-96 rounded"
                  title={getFileName()}
                  onError={() => setError('Failed to load PDF')}
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                PDF Preview (Click to see full view in new tab)
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-64 gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 16.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5m-7-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H1.5a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H1.5a.5.5 0 01-.5-.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  This file type cannot be previewed in the browser.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Download the file to view it.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {absoluteDocumentUrl && (
          <div className="flex items-center justify-end border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-3xl sticky bottom-0">
            <a
              href={absoluteDocumentUrl}
              download={getFileName()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DocumentPreviewModal;
