import React, { useState, useEffect, useRef } from 'react';
import type { AppView, UserProfile } from '../types';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
    currentView: AppView;
    setCurrentView: (view: AppView) => void;
    theme: string;
    setTheme: (theme: string) => void;
}

const NavItem: React.FC<{ title: string; view: AppView; currentView: AppView; onClick: () => void }> = ({ title, view, currentView, onClick }) => {
    const isActive = view === currentView;
    return (
        <button
            onClick={onClick}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-accent text-brand-bg-contrast' : 'text-brand-text-secondary hover:bg-brand-surface-light hover:text-brand-text'
            }`}
        >
            {title}
        </button>
    );
};

const ThemeToggle: React.FC<{ theme: string; setTheme: (theme: string) => void }> = ({ theme, setTheme }) => {
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <button onClick={toggleTheme} className="p-2 rounded-full text-brand-text-secondary hover:bg-brand-surface-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-accent">
            {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
};

const UserAvatar: React.FC<{ user: UserProfile }> = ({ user }) => (
    <>
        {user.photoURL ? (
            <img className="h-8 w-8 rounded-full" src={user.photoURL} alt="User avatar" />
        ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-surface-light">
                <span className="text-sm font-medium leading-none text-brand-text-secondary">
                    {(user.displayName?.charAt(0) || user.email?.charAt(0) || '').toUpperCase()}
                </span>
            </span>
        )}
    </>
);

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, theme, setTheme }) => {
    const { user, signOut: firebaseSignOut } = useAuth();
    const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileMenuRef]);

    const handleNavigate = (view: AppView) => {
        setCurrentView(view);
        setProfileMenuOpen(false);
    };

    return (
        <header className="bg-brand-surface shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <svg className="h-8 w-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-xl font-bold ml-3 text-brand-text">PineTrader</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user && (
                            <nav className="hidden sm:flex items-center space-x-2 sm:space-x-4">
                                <NavItem title="Панель" view="DASHBOARD" currentView={currentView} onClick={() => setCurrentView('DASHBOARD')} />
                                <NavItem title="Редактор" view="STRATEGY_EDITOR" currentView={currentView} onClick={() => setCurrentView('STRATEGY_EDITOR')} />
                                <NavItem title="Бектест" view="BACKTESTING" currentView={currentView} onClick={() => setCurrentView('BACKTESTING')} />
                                <NavItem title="Графики" view="CHARTS" currentView={currentView} onClick={() => setCurrentView('CHARTS')} />
                                <NavItem title="Данные" view="DATA_MANAGER" currentView={currentView} onClick={() => setCurrentView('DATA_MANAGER')} />
                                <NavItem title="Настройки" view="SETTINGS" currentView={currentView} onClick={() => setCurrentView('SETTINGS')} />
                            </nav>
                        )}
                         <ThemeToggle theme={theme} setTheme={setTheme} />
                         {user && (
                            <div className="relative" ref={profileMenuRef}>
                                <button
                                    onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-accent"
                                    id="user-menu-button"
                                    aria-expanded={isProfileMenuOpen}
                                    aria-haspopup="true"
                                >
                                    <span className="sr-only">Open user menu</span>
                                    <UserAvatar user={user} />
                                </button>
                                {isProfileMenuOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-brand-surface ring-1 ring-black ring-opacity-5 focus:outline-none z-20" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                                        <div className="py-1" role="none">
                                            <div className="px-4 py-2 border-b border-brand-surface-light">
                                                <p className="text-sm font-semibold text-brand-text" role="none">
                                                    {user.displayName || 'Пользователь'}
                                                </p>
                                                <p className="text-xs text-brand-text-secondary truncate" role="none">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('SETTINGS'); }} className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-surface-light" role="menuitem">
                                                Настройки аккаунта
                                            </a>
                                            <a href="#" onClick={(e) => { e.preventDefault(); firebaseSignOut(); }} className="block w-full text-left px-4 py-2 text-sm text-brand-text hover:bg-brand-surface-light" role="menuitem">
                                                Выход
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;