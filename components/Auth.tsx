import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './shared/Card';
import Button from './shared/Button';

const Auth: React.FC = () => {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState<'google' | 'email' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading('email');
        try {
            if (isLogin) {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Произошла ошибка.');
        } finally {
            setLoading(null);
        }
    };
    
    const handleGoogleAuth = async () => {
        setError(null);
        setLoading('google');
        try {
            await signInWithGoogle();
        } catch (err: any) {
             setError(err.message || 'Произошла ошибка.');
        } finally {
            setLoading(null);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
            <div className="max-w-md w-full">
                <div className="flex items-center justify-center mb-6">
                     <svg className="h-10 w-10 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h1 className="text-3xl font-bold ml-3 text-brand-text">PineTrader</h1>
                </div>
                <Card>
                    <h2 className="text-xl font-semibold text-center text-brand-text mb-4">
                        {isLogin ? 'Вход в систему' : 'Регистрация'}
                    </h2>
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-brand-text-secondary">Пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-brand-danger">{error}</p>}
                        <Button type="submit" className="w-full" isLoading={loading === 'email'}>
                            {isLogin ? 'Войти' : 'Зарегистрироваться'}
                        </Button>
                    </form>

                     <div className="mt-4 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-brand-surface-light" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-brand-surface text-brand-text-secondary">Или</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <Button variant="secondary" className="w-full" onClick={handleGoogleAuth} isLoading={loading === 'google'}>
                            <svg className="w-5 h-5 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 56.6l-58.3 57.1C336.1 92.2 296.3 75.2 248 75.2 148.8 75.2 72.6 153.2 72.6 256s76.2 180.8 175.4 180.8c109.8 0 142.3-85.3 147.1-131.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                            Войти через Google
                        </Button>
                    </div>

                    <div className="mt-6 text-center">
                        <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-sm text-brand-accent hover:underline">
                            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Auth;
