import React, { useState, useEffect } from 'react';
import type { AppView } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StrategyEditor from './components/StrategyEditor';
import Backtesting from './components/Backtesting';
import Settings from './components/Settings';
import DataManager from './components/DataManager';
import Charts from './components/Charts';
import TinkoffServices from './components/TinkoffServices';
import Spinner from './components/shared/Spinner';
import { AuthProvider, useAuth } from './hooks/useAuth';

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    const [currentView, setCurrentView] = useState<AppView>('DASHBOARD');
    const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <Spinner />
            </div>
        );
    }

    const handleNavigateToEditor = (id: string | null = null) => {
        setEditingStrategyId(id);
        setCurrentView('STRATEGY_EDITOR');
    };

    const handleSaveStrategy = () => {
        setEditingStrategyId(null);
        setCurrentView('DASHBOARD');
    };
    
    const renderView = () => {
        switch (currentView) {
            case 'DASHBOARD':
                return <Dashboard onEditStrategy={handleNavigateToEditor} />;
            case 'STRATEGY_EDITOR':
                return <StrategyEditor strategyId={editingStrategyId} onSave={handleSaveStrategy} />;
            case 'BACKTESTING':
                return <Backtesting />;
            case 'CHARTS':
                return <Charts />;
            case 'SETTINGS':
                return <Settings />;
            case 'DATA_MANAGER':
                return <DataManager />;
            case 'TINKOFF_SERVICES':
                return <TinkoffServices />;
            default:
                return <Dashboard onEditStrategy={handleNavigateToEditor} />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text">
            <Header currentView={currentView} setCurrentView={setCurrentView} theme={theme} setTheme={setTheme} />
            <main className="flex-grow p-4 sm:p-6 lg:p-8">
                {renderView()}
            </main>
        </div>
    );
};


const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;