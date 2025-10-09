
import React, { useState, useEffect } from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import Spinner from './shared/Spinner';
import { useAuth } from '../hooks/useAuth';
import { fetchUserSecret, saveUserSecret, deleteUserSecret } from '../services/mockApi';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTokenValue, setNewTokenValue] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadSecret = async () => {
        setLoading(true);
        try {
            const secret = await fetchUserSecret();
            setToken(secret.tinkoffApiToken);
        } catch (error) {
            console.error("Failed to load user secret", error);
            showMessage('Не удалось загрузить данные токена.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if(user) {
            loadSecret();
        }
    }, [user]);
    
    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleSaveToken = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTokenValue) return;

        setIsProcessing(true);
        try {
            await saveUserSecret(newTokenValue);
            showMessage('Токен успешно сохранен!', 'success');
            setNewTokenValue('');
            setShowAddForm(false);
            await loadSecret(); // Reload data to reflect changes
        } catch (error: any) {
            console.error("Error saving token:", error);
            showMessage(error.message || 'Ошибка при сохранении токена.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteToken = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить API токен?')) {
            return;
        }
        setIsProcessing(true);
        try {
            await deleteUserSecret();
            showMessage('Токен успешно удален.', 'success');
            await loadSecret();
        } catch (error: any) {
            console.error('Failed to delete token', error);
            showMessage(error.message || 'Не удалось удалить токен.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Card title="Управление API токенами Tinkoff">
                <div className="space-y-4">
                     <div>
                        <p className="text-sm text-brand-text-secondary">
                           Добавьте ваш API токен от Tinkoff Invest, чтобы приложение могло получать данные о вашем портфеле и выполнять торговые операции.
                           <br />
                           В этом mock-режиме ваш API токен хранится в `localStorage` вашего браузера. <strong>Не используйте боевые токены в публичных окружениях.</strong>
                        </p>
                    </div>

                    {loading ? <Spinner /> : (
                        <div className="space-y-3">
                            {token ? (
                                <div className="flex items-center justify-between p-3 bg-brand-surface-light rounded-md">
                                    <div>
                                        <p className="font-semibold text-brand-text">Tinkoff API Token</p>
                                        <p className="text-sm text-brand-text-secondary font-mono">{`t. ... ${token.slice(-4)}`}</p>
                                    </div>
                                     <span className="flex items-center text-sm font-semibold text-green-400">
                                        <span className="flex h-3 w-3 mr-2 rounded-full bg-green-500"></span>
                                        Активен
                                    </span>
                                </div>
                            ) : (
                                <p className="text-center text-brand-text-secondary py-4">API токен еще не добавлен.</p>
                            )}
                        </div>
                    )}
                    
                    {message && (
                         <div className={`p-3 rounded-md text-sm mt-4 ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {message.text}
                        </div>
                    )}

                    {!showAddForm && (
                         <div className="pt-4 mt-4 border-t border-brand-surface-light flex justify-start space-x-2">
                            <Button onClick={() => setShowAddForm(true)} disabled={isProcessing}>
                                {token ? 'Обновить токен' : 'Добавить токен'}
                            </Button>
                            {token && (
                                <Button variant="danger" onClick={handleDeleteToken} isLoading={isProcessing && !!token} disabled={isProcessing}>
                                    Удалить
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {showAddForm && (
                 <Card title={token ? 'Обновить API токен' : 'Добавить API токен'}>
                    <form onSubmit={handleSaveToken} className="space-y-4">
                        <div>
                            <label htmlFor="tokenValue" className="block text-sm font-medium text-brand-text-secondary">Значение токена</label>
                            <input
                                type="text"
                                id="tokenValue"
                                value={newTokenValue}
                                onChange={(e) => setNewTokenValue(e.target.value)}
                                className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent font-mono"
                                placeholder="t.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                             <Button variant="secondary" onClick={() => setShowAddForm(false)} type="button" disabled={isProcessing}>
                                Отмена
                            </Button>
                            <Button type="submit" isLoading={isProcessing} disabled={isProcessing || !newTokenValue}>
                                Сохранить
                            </Button>
                        </div>
                    </form>
                </Card>
            )}
        </div>
    );
};

export default Settings;
