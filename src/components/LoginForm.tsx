import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
// Import login function and AuthResponse type from service
import { loginUser, AuthResponse } from '../services/elevenlabs';
import Button from './Button';
import FormField from './FormField';

type LoginFormProps = {
  onLoginSuccess: (data: AuthResponse) => void; // Callback with user data and token
  switchToRegister: () => void; // Function to switch view to register form
};

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, switchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser(email, password);
      // Call the success callback with the received data (token, user info)
      onLoginSuccess(response);
      // No need to clear form here, parent component will likely re-render

    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || 'An unknown error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow border border-gray-200">
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Log In</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          label="Email Address"
          htmlFor="login-email"
        >
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="username" // Help browser autofill
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="login-password"
        >
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password" // Help browser autofill
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
          />
        </FormField>

        {/* Optional: Add 'Forgot Password?' link here */}

        {error && (
           <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
             <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
             {error}
           </div>
        )}

        <Button 
          type="submit" 
          variant="primary"
          className="w-full flex justify-center py-2.5"
          disabled={isLoading}
          icon={isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        >
          {isLoading ? 'Logging In...' : 'Log In'}
        </Button>

        <div className="text-sm text-center text-gray-600">
          <span>Don't have an account? </span> 
          <Button 
              type="button"
              variant="ghost"
              onClick={switchToRegister}
              className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline p-0 align-baseline disabled:opacity-50"
              disabled={isLoading}
          >
              Sign up here
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm; 