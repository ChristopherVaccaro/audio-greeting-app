import React from 'react';
import { Volume, Settings, LogOut, Moon, Sun } from 'lucide-react';
import Button from './Button';
import { CurrentUser } from '../types';

type HeaderProps = {
  onOpenApiKeyModal: () => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
  theme: string;
  toggleTheme: () => void;
};

const Header: React.FC<HeaderProps> = ({ onOpenApiKeyModal, currentUser, onLogout, theme, toggleTheme }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <Volume className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-gray-100">AudioGreets</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={toggleTheme} 
              variant="ghost" 
              size="sm"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {currentUser ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">Welcome, {currentUser.email}</span>
                <Button
                  onClick={onLogout}
                  variant="outline"
                  size="sm"
                  icon={<LogOut className="h-4 w-4" />}
                  className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
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
                className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                API Settings
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;