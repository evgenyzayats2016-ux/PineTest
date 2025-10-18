import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import type { UserProfile } from '../types';
import { MOCKED_USER_ID } from '../constants';

// The mock user profile
const mockUser: UserProfile = {
    uid: MOCKED_USER_ID,
    email: 'mock.user@pinetrader.dev',
    displayName: 'Mock Trader',
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=MockTrader`,
    createdAt: new Date('2023-01-01T00:00:00Z').toISOString(),
};

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // "log in" the mock user after a short delay to simulate loading
        const timer = setTimeout(() => {
            setUser(mockUser);
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, []);
    
    // Dummy functions for the interface
    const signInWithGoogle = async () => console.log("signInWithGoogle called (mocked)");
    const signUpWithEmail = async (email: string, password: string) => console.log("signUpWithEmail called (mocked)");
    const signInWithEmail = async (email: string, password: string) => console.log("signInWithEmail called (mocked)");
    const signOut = async () => {
        console.log("signOut called (mocked)");
        // The sign out button in the header will now just log to console.
    };

    const value = {
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut
    };

    return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};