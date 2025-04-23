import React from 'react';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
  isRequired?: boolean;
};

const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  children,
  className = '',
  description,
  isRequired = false,
}) => {
  return (
    <div className={` ${className}`}>
      <label 
        htmlFor={htmlFor} 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{description}</p>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default FormField;