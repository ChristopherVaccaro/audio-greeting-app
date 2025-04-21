import React from 'react';
import { Shield } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase mb-4">
              About AudioGreets
            </h3>
            <p className="text-gray-500 text-sm">
              Create personalized audio greetings using cutting-edge text-to-speech technology.
              Perfect for birthdays, anniversaries, congratulations, and more.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase mb-4">
              Powered By
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://elevenlabs.io" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  ElevenLabs API
                </a>
              </li>
              <li>
                <a 
                  href="https://react.dev" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  React
                </a>
              </li>
              <li>
                <a 
                  href="https://tailwindcss.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Tailwind CSS
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase mb-4">
              Security & Privacy
            </h3>
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <p className="text-gray-500 text-sm">
                Your API keys and audio data are processed securely. We do not store your API keys on our servers.
                All audio processing is done through secure connections.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} AudioGreets. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;