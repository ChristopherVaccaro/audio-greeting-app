import React, { useRef, useState } from 'react';
import { Link, Copy, CheckCircle } from 'lucide-react';
import Button from './Button';

type ShareLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string | null;
};

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, audioUrl }) => {
  const [copied, setCopied] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !audioUrl) return null;

  // In a real app, we would generate a shareable link to a permanent storage location
  // For this demo, we'll just use the blob URL (which won't work for actual sharing)
  const shareableLink = audioUrl;

  const handleCopy = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      document.execCommand('copy');
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
              <Link className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Share via Link</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Copy this link to share your audio greeting with others. They'll be able to listen to your message directly.
          </p>
          
          <div className="mb-4">
            <label htmlFor="shareLink" className="block text-sm font-medium text-gray-700 mb-1">
              Shareable Link
            </label>
            <div className="flex">
              <input
                ref={linkInputRef}
                type="text"
                id="shareLink"
                value={shareableLink}
                readOnly
                className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
              >
                {copied ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            {copied && (
              <p className="mt-1 text-sm text-green-600">Link copied to clipboard!</p>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;