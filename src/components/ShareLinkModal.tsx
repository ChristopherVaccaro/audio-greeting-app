import React, { useRef, useState, useEffect } from 'react';
import { Link, Copy, CheckCircle } from 'lucide-react';
import Button from './Button';

type ShareLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string | null;
};

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, audioUrl }) => {
  const [shareableLink, setShareableLink] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Simulate generating a shareable link
  // In a real app, this might involve uploading the blob and getting a permanent URL
  useEffect(() => {
    if (isOpen && audioUrl) {
      // For now, just use the blob URL. This only works in the user's current browser session.
      // A real implementation would require backend logic to store the audio and provide a persistent link.
      setShareableLink(audioUrl);
      setIsCopied(false); // Reset copied state when modal opens or URL changes
    } else {
      setShareableLink('');
    }
  }, [isOpen, audioUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      // Optionally show an error message to the user
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
              <Link className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Share Audio Link</h2>
          </div>
          
          {shareableLink ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Copy the link below to share your audio greeting.
                <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1">(Note: This link is temporary and only works in your current browser session).</span>
              </p>
              <div className="flex items-center space-x-2">
                <input
                  ref={linkInputRef}
                  type="text"
                  readOnly
                  value={shareableLink}
                  className="flex-grow block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sm:text-sm focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-not-allowed"
                  aria-label="Shareable audio link"
                />
                <Button
                  variant="secondary"
                  onClick={handleCopyLink}
                  icon={isCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  aria-label={isCopied ? 'Copied' : 'Copy link'}
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Generate an audio greeting first to get a shareable link.
            </p>
          )}
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {/* Add other share options if needed */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;