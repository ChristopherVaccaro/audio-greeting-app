import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { registerUser, RegisterResponse } from '../services/elevenlabs'; 
import Button from './Button';
import FormField from './FormField';

type RegisterFormProps = {
  onRegisterSuccess: () => void; 
  switchToLogin: () => void; 
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess, switchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Password cannot be empty.'); return; }
    setIsLoading(true);
    try {
      const response: RegisterResponse = await registerUser(email, password);
      setSuccessMessage(response.message + ". You can now log in.");
      setEmail('');
      setPassword('');
      setTimeout(onRegisterSuccess, 2000);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message || 'An unknown error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-center text-gray-800 dark:text-gray-100 mb-6">Create Account</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Email Address" htmlFor="register-email">
          <input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={isLoading} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 sm:text-sm disabled:opacity-50" />
        </FormField>
        <FormField label="Password" htmlFor="register-password">
          <input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={isLoading} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 sm:text-sm disabled:opacity-50" />
        </FormField>
        {successMessage && <div className="text-sm text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-3 rounded-md border border-green-200 dark:border-green-600/50">{successMessage}</div>}
        {error && <div className="flex items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md border border-red-200 dark:border-red-600/50"><AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 text-red-500 dark:text-red-400" />{error}</div>}
        <Button type="submit" variant="primary" className="w-full flex justify-center py-2.5" disabled={isLoading} icon={isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
        <div className="text-sm text-center text-gray-600 dark:text-gray-400">
          <span>Already have an account? </span> 
          <Button 
            type="button" 
            variant="ghost"
            onClick={switchToLogin} 
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline focus:outline-none p-0 h-auto align-baseline disabled:opacity-50" 
            disabled={isLoading}
          >
              Log in here
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm; 