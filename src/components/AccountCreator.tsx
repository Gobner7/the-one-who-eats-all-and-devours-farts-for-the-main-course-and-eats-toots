import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Loader2, Check, X } from 'lucide-react';
import { robloxAccountCreator } from '../services/roblox/account-creator';
import { Button } from './ui/Button';

interface CreatedAccount {
  username: string;
  password: string;
  timestamp: Date;
}

export const AccountCreator: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [accounts, setAccounts] = useState<CreatedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await robloxAccountCreator.createAccount();
      
      if (result.success && result.username && result.password) {
        setAccounts(prev => [...prev, {
          username: result.username!,
          password: result.password!,
          timestamp: new Date()
        }]);
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleExport = () => {
    const content = accounts.map(acc => 
      `${acc.username}:${acc.password}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roblox_accounts_${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserPlus className="w-6 h-6" />
          Account Creator
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateAccount}
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Create Account
          </Button>
          {accounts.length > 0 && (
            <Button
              onClick={handleExport}
              variant="outline"
            >
              Export Accounts
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="space-y-4">
          {accounts.map((account, index) => (
            <motion.div
              key={account.username}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{account.username}</p>
                <p className="text-sm text-gray-400">{account.password}</p>
              </div>
              <Check className="w-5 h-5 text-green-400" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};