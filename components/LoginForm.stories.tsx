import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';
import { useState } from 'react';

// Login Form Component
const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { username, password, isLogin });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Glass Morphism Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white border-opacity-20 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-purple-200">Sign in to continue your Tic-Tac-Toe adventure</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-4 bg-white bg-opacity-10 border-2 border-purple-300 border-opacity-30 rounded-2xl focus:outline-none focus:border-purple-600 text-white placeholder-pink-200 text-lg transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your username..."
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-purple-300 text-xl">👤</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-white bg-opacity-10 border-2 border-purple-300 border-opacity-30 rounded-2xl focus:outline-none focus:border-purple-600 text-white placeholder-pink-200 text-lg transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your password..."
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-purple-300 text-xl">🔒</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 via-pink-400 to-red-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:from-purple-700 hover:via-pink-500 hover:to-red-600 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <span className="text-xl">🚀</span>
              <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
            </button>

            <div className="text-center">
              <span className="text-purple-200">or</span>
            </div>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full bg-white bg-opacity-10 backdrop-blur-sm text-white font-medium py-4 px-6 rounded-2xl border border-white border-opacity-20 transition-all duration-300 hover:bg-opacity-20 hover:scale-105"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white border-opacity-20">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-green-400 text-lg">✅</span>
                <span className="text-purple-200">Real-time multiplayer gaming</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-400 text-lg">✅</span>
                <span className="text-purple-200">Live chat with other players</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-400 text-lg">✅</span>
                <span className="text-purple-200">Free to play, no registration fees</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof LoginForm> = {
  title: 'Components/LoginForm',
  component: LoginForm,
  parameters: {
    layout: 'fullscreen',
    chromatic: { 
      viewports: [320, 768, 1024, 1440],
      delay: 1000, // Wait for animations to complete
    },
  },
  tags: ['autodocs'],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithFilledForm: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Fill in the form
    const usernameInput = canvas.getByPlaceholderText('Enter your username...');
    const passwordInput = canvas.getByPlaceholderText('Enter your password...');
    
    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'testpassword');
  },
};

export const FocusedInput: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Focus on username input
    const usernameInput = canvas.getByPlaceholderText('Enter your username...');
    await userEvent.click(usernameInput);
  },
};

export const HoveredButton: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Hover over the sign in button
    const signInButton = canvas.getByText('Sign In');
    await userEvent.hover(signInButton);
  },
}; 