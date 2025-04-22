import React from 'react';
import { Volume, Settings, LogOut } from 'lucide-react';
import Button from './Button';
import { CurrentUser } from '../types';

type HeaderProps = {
  onOpenApiKeyModal: () => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
};

const Header: React.FC<HeaderProps> = ({ onOpenApiKeyModal, currentUser, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <Volume className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">AudioGreets</span>
              </div>
            </div>
            <div className="hidden md:block ml-6">
              <div className="text-sm text-gray-500">
                Create and share personalized audio greetings
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">Welcome, {currentUser.email}</span>
                <Button
                  onClick={onLogout}
                  variant="outline"
                  size="sm"
                  icon={<LogOut className="h-4 w-4" />}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={onOpenApiKeyModal}
                variant="outline"
                size="sm"
                icon={<Settings className="h-4 w-4" />}
              >
                API Settings (Legacy)
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;