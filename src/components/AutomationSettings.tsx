import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, Youtube, Shield, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from './ui/Button';

export const AutomationSettings: React.FC = () => {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    // Save API credentials to localStorage
    localStorage.setItem('youtube_api_key', data.youtubeApiKey);
    localStorage.setItem('google_client_id', data.googleClientId);
    localStorage.setItem('google_client_secret', data.googleClientSecret);
    
    // Simulate auth in preview mode
    localStorage.setItem('user_data', JSON.stringify({
      name: "Demo User",
      email: "demo@example.com",
      picture: "https://ui-avatars.com/api/?name=Demo+User&background=random",
      accessToken: "demo_access_token"
    }));

    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Key className="w-6 h-6" />
          API Credentials
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                YouTube API Key
              </label>
              <input
                type="password"
                {...register('youtubeApiKey')}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
                placeholder="Enter your YouTube API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Google Client ID
              </label>
              <input
                type="password"
                {...register('googleClientId')}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
                placeholder="Enter your Google Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Google Client Secret
              </label>
              <input
                type="password"
                {...register('googleClientSecret')}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
                placeholder="Enter your Google Client Secret"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Save & Connect
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Preview Mode Notice:</h3>
          <p className="text-sm text-gray-400">
            In preview mode, entering any credentials will create a demo account for testing. 
            Real Google authentication will be available when deployed.
          </p>
        </div>
      </motion.div>
    </div>
  );
};