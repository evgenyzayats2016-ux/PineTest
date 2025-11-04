import React, { useState } from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import Spinner from './shared/Spinner';
import type { OhlcvBar } from '../types';
import { fetchUserSecret, fetchTinkoffCandles } from '../services/mockApi';

const TinkoffServices: React.FC = () => {
    const [figi, setFigi] = useState('BBG004730N88'); // Default to SBER
    const [candles, setCandles] = useState<OhlcvBar[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchCandles = async () => {
        setLoading(true);
        setError(null);
        setCandles([]);

        try {
            const secret = await fetchUserSecret();
            if (!secret.tinkoffApiToken) {
                throw new Error("API токен Tinkoff не найден. Пожалуйста, добавьте его на странице 'Настройки'.");
            }
            const data = await fetchTinkoffCandles(figi, secret.tinkoffApiToken);
            setCandles(data);
        } catch (err: any) {
            setError(err.message || 'Произошла неизвестная ошибка.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card title="Сервисы Tinkoff Invest API">
                <p className="text-sm text-brand-text-secondary">
                    Этот раздел предназначен для прямого взаимодействия с методами Tinkoff API.
                    Для работы требуется активный API токен, указанный в настройках.
                </p>
            </Card>

            <Card title="Получение исторических котировок (GetCandles)">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-3 sm:space-y-0">
                        <div className="flex-grow">
                            <label htmlFor="figi-input" className="block text-sm font-medium text-brand-text-secondary">
                                FIGI инструмента
                            </label>
                            <input
                                type="text"
                                id="figi-input"
                                value={figi}
                                onChange={(e) => setFigi(e.target.value)}
                                className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent font-mono"
                                placeholder="Например, BBG004730N88"
                            />
                        </div>
                        <Button onClick={handleFetchCandles} isLoading={loading} disabled={loading || !figi}>
                            Получить данные
                        </Button>
                    </div>

                    {error && (
                        <div className="p-3 rounded-md text-sm bg-red-500/20 text-red-300">
                            {error}
                        </div>
                    )}
                    
                    {loading && <Spinner />}

                    {candles.length > 0 && (
                         <div className="overflow-auto max-h-96 border border-brand-surface-light rounded-lg mt-4">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-brand-text-secondary uppercase sticky top-0 bg-brand-surface">
                                    <tr>
                                        <th className="py-2 px-3">Timestamp</th>
                                        <th className="py-2 px-3">Open</th>
                                        <th className="py-2 px-3">High</th>
                                        <th className="py-2 px-3">Low</th>
                                        <th className="py-2 px-3">Close</th>
                                        <th className="py-2 px-3">Volume</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono">
                                    {candles.map(bar => (
                                        <tr key={bar.timestamp} className="border-b border-brand-surface-light last:border-b-0">
                                            <td className="py-2 px-3">{new Date(bar.timestamp).toLocaleString('ru-RU')}</td>
                                            <td className="py-2 px-3">{bar.open.toFixed(4)}</td>
                                            <td className="py-2 px-3">{bar.high.toFixed(4)}</td>
                                            <td className="py-2 px-3">{bar.low.toFixed(4)}</td>
                                            <td className="py-2 px-3">{bar.close.toFixed(4)}</td>
                                            <td className="py-2 px-3">{bar.volume ?? 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            </Card>
        </div>
    );
};

export default TinkoffServices;