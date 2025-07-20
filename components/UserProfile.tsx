'use client';

import { usePusher } from '@/hooks/usePusher';
import React, { useEffect, useState } from 'react';

interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    createdAt: Date;
    lastLogin?: Date;
}

interface UserProfileProps {
    userId: string;
    onProfileUpdate?: (user: User) => void;
    onClose?: () => void;
}

interface EditFormData {
    username: string;
    email: string;
}

export default function UserProfile({ userId, onProfileUpdate, onClose }: UserProfileProps) {
    const { isConnected } = usePusher();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<EditFormData>({ username: '', email: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Fetch user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Simulate API call - replace with actual endpoint
                const response = await fetch(`/api/users/${userId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch user data: ${response.status}`);
                }

                const userData = await response.json();
                setUser(userData);
                setEditForm({
                    username: userData.username,
                    email: userData.email
                });
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load user profile');
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        try {
            setIsSaving(true);
            setError(null);

            // Validate form data
            if (!editForm.username.trim()) {
                throw new Error('Username is required');
            }

            if (!editForm.email.trim() || !editForm.email.includes('@')) {
                throw new Error('Valid email is required');
            }

            // Simulate API call - replace with actual endpoint
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editForm),
            });

            if (!response.ok) {
                throw new Error(`Failed to update profile: ${response.status}`);
            }

            const updatedUser = await response.json();
            setUser(updatedUser);
            setIsEditing(false);

            // Notify parent component
            onProfileUpdate?.(updatedUser);

        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle cancel edit
    const handleCancel = () => {
        if (user) {
            setEditForm({
                username: user.username,
                email: user.email
            });
        }
        setIsEditing(false);
        setError(null);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                        <p className="text-white text-lg">Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="bg-red-500/10 backdrop-blur-lg rounded-2xl p-8 border border-red-400/30 shadow-lg max-w-md">
                    <div className="text-center">
                        <div className="text-red-400 text-4xl mb-4">⚠️</div>
                        <h2 className="text-red-300 text-xl font-semibold mb-2">Error Loading Profile</h2>
                        <p className="text-red-200 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg border border-red-400/30 hover:bg-red-500/30 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No user data
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg">
                    <p className="text-white text-lg">User not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="text-purple-300 hover:text-white transition-colors"
                            aria-label="Close profile"
                        >
                            ← Back
                        </button>
                        <h1 className="text-3xl font-bold text-white">User Profile</h1>
                    </div>

                    {/* Connection Status */}
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${isConnected
                            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                            : 'bg-red-500/20 text-red-300 border border-red-400/30'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg">
                    {!isEditing ? (
                        /* View Mode */
                        <div className="space-y-6">
                            {/* Avatar and Basic Info */}
                            <div className="flex items-center space-x-6">
                                <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={`${user.username}'s avatar`}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        user.username.charAt(0).toUpperCase()
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white mb-2">{user.username}</h2>
                                    <p className="text-purple-200">{user.email}</p>
                                    <p className="text-gray-400 text-sm">
                                        Member since {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                    {user.lastLogin && (
                                        <p className="text-gray-400 text-sm">
                                            Last login: {new Date(user.lastLogin).toLocaleString()}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-gradient-to-r from-purple-600 to-pink-400 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-500 transition-all duration-300"
                                    aria-label="Edit profile"
                                >
                                    Edit Profile
                                </button>
                            </div>

                            {/* Stats Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-300">0</div>
                                    <div className="text-gray-400 text-sm">Games Played</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-300">0</div>
                                    <div className="text-gray-400 text-sm">Games Won</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-300">0%</div>
                                    <div className="text-gray-400 text-sm">Win Rate</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Edit Mode */
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <h3 className="text-xl font-semibold text-white mb-6">Edit Profile</h3>

                            {/* Username Field */}
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-purple-200 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={editForm.username}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Enter username"
                                    required
                                    aria-describedby="username-error"
                                />
                                {error && <p id="username-error" className="text-red-400 text-sm mt-1">{error}</p>}
                            </div>

                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-purple-200 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={editForm.email}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Enter email"
                                    required
                                    aria-describedby="email-error"
                                />
                                {error && <p id="email-error" className="text-red-400 text-sm mt-1">{error}</p>}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-4 pt-6">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-400 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="flex-1 bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
} 