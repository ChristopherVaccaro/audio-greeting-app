import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import Button from './Button';

type EmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
};

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSend }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    onSend(email);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-3">
              <Mail className="h-5 w-5 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Send via Email</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Enter the recipient's email address to send your audio greeting.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                placeholder="recipient@example.com"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary">
                Send Email
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;