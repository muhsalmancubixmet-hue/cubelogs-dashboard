'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function MagicLoginForm({ onSuccess, onTogglePassword }) {
  const { magicLogin } = useApp();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Please enter your magic login token.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await magicLogin(token);
      if (res.success) {
        if (onSuccess) onSuccess(res.user);
      } else {
        setError(res.message || 'Invalid or expired magic token.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during magic login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md" role="alert">
          {error}
        </div>
      )}
      <Input
        id="magic-token"
        label="Magic Login Token"
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Enter token from email..."
        required
      />
      <div className="flex justify-between items-center text-xs pt-1">
        {onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="text-blue-600 hover:underline focus:outline-none"
          >
            Sign in with Password instead
          </button>
        )}
      </div>
      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={isLoading}
        className="w-full"
      >
        Authenticate Magic Token
      </Button>
    </form>
  );
}
