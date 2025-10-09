
import React, { useState, useEffect } from 'react';
import Card from './shared/Card';
import Spinner from './shared/Spinner';
import Button from './shared/Button';
import Toast from './shared/Toast';
import type { Strategy, Trade } from '../types';
import { useAuth } from '../hooks/useAuth';
import { fetchStrategies, fetchTrades, toggleStrategyStatus, duplicateStrategy } from '../services/mockApi';

// Helpers for formatting
const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(value);
    
const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('ru-RU');
}


const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const statusMap = {
        true: { text: 'АКТИВНА', color: 'bg-green-500' },
        false: { text: 'ОСТАНОВЛЕНА', color: 'bg-gray-500' },
    };
    const status = isActive ? 'true' : 'false';
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${statusMap[status].color}`}>{statusMap[status].text}</span>;
}

interface DashboardProps {
    onEditStrategy: (id: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onEditStrategy }) => {
    const { user } = useAuth();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);
    const [processingStrategyId, setProcessingStrategyId] = useState<string | null>(null);
    const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
    
    const loadData = async () => {
        try {
            const [strategiesData, tradesData] = await Promise.all([
                fetchStrategies(),
                fetchTrades()
            ]);
            setStrategies(strategiesData);
            setTrades(tradesData);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
            showToast('Не удалось загрузить данные.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [user]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ id: Date.now(), message, type });
    };

    const handleToggleStrategy = async (strategy: Strategy) => {
        setProcessingStrategyId(strategy.strategyId);
        try {
            await toggleStrategyStatus(strategy.strategyId, !strategy.isActive);
            await loadData(); // Reload data to reflect changes
            showToast(`Статус стратегии "${strategy.name}" изменен.`, 'success');
        } catch (error: any) {
            console.error("Failed to toggle strategy status", error);
            showToast(error.message || 'Не удалось изменить статус стратегии.', 'error');
        } finally {
            setProcessingStrategyId(null);
        }
    };
    
    const handleDuplicateStrategy = async (strategyId: string) => {
        setProcessingStrategyId(strategyId);
        try {
            await duplicateStrategy(strategyId);
            await loadData(); // Reload data to reflect changes
            showToast(`Стратегия успешно скопирована.`, 'success');
        } catch (error: any) {
            console.error("Failed to duplicate strategy", error);
            showToast(error.message || 'Не удалось скопировать стратегию.', 'error');
        } finally {
            setProcessingStrategyId(null);
        }
    };

    const handleTradeRowClick = (tradeId: string) => {
        setExpandedTradeId(prevId => (prevId === tradeId ? null : tradeId));
    };

    if (loading) {
        return <Spinner />;
    }

    return (
        <div className="space-y-6">
            {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <Card title="Сводка портфеля (Tinkoff Invest API)">
                <div className="text-center py-8 text-brand-text-secondary">
                    <p>Интеграция с Tinkoff Invest API в разработке.</p>
                    <p className="text-sm">Здесь будет отображаться информация о балансе, P&L и открытых позициях.</p>
                </div>
            </Card>

            <Card title="Торговые стратегии" action={
                <Button onClick={() => onEditStrategy(null)}>Создать стратегию</Button>
            }>
               <div className="space-y-3">
                    {strategies.length > 0 ? strategies.map(s => (
                        <div key={s.strategyId} className="flex items-center justify-between p-3 bg-brand-surface-light rounded-md">
                            <div className="flex-grow pr-4">
                                <p className="font-semibold text-brand-text">{s.name}</p>
                                <p className="text-sm text-brand-text-secondary">{s.instrumentFigi} @ {s.timeframe}</p>
                            </div>
                            <div className="flex items-center space-x-3 shrink-0">
                                <StatusBadge isActive={s.isActive} />
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant={s.isActive ? 'secondary' : 'primary'}
                                        onClick={() => handleToggleStrategy(s)}
                                        isLoading={processingStrategyId === s.strategyId}
                                        disabled={processingStrategyId !== null}
                                        className="py-1 px-3 text-sm"
                                    >
                                        {s.isActive ? 'Отключить' : 'Включить'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleDuplicateStrategy(s.strategyId)}
                                        isLoading={processingStrategyId === s.strategyId}
                                        disabled={processingStrategyId !== null}
                                        className="py-1 px-3 text-sm"
                                    >
                                        Дублировать
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => onEditStrategy(s.strategyId)}
                                        disabled={processingStrategyId !== null}
                                        className="py-1 px-3 text-sm"
                                    >
                                        Изменить
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-brand-text-secondary py-4">У вас еще нет стратегий. Начните с создания новой.</p>
                    )}
                </div>
            </Card>

            <Card title="Журнал сделок">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="py-3 px-2 w-8" aria-label="Развернуть"></th>
                                <th className="py-3 px-4">Время</th>
                                <th className="py-3 px-4">Стратегия</th>
                                <th className="py-3 px-4">Направление</th>
                                <th className="py-3 px-4">P&L</th>
                                <th className="py-3 px-4">Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.length > 0 ? trades.map(trade => {
                                const isExpanded = expandedTradeId === trade.tradeId;
                                return (
                                    <React.Fragment key={trade.tradeId}>
                                        <tr 
                                            className="border-b border-brand-surface-light hover:bg-brand-surface-light cursor-pointer transition-colors"
                                            onClick={() => handleTradeRowClick(trade.tradeId)}
                                            aria-expanded={isExpanded}
                                        >
                                            <td className="py-3 px-2 text-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-brand-text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </td>
                                            <td className="py-3 px-4">{formatTimestamp(trade.createdAt)}</td>
                                            <td className="py-3 px-4">{strategies.find(s => s.strategyId === trade.strategyId)?.name || trade.strategyId.slice(0, 5)}</td>
                                            <td className="py-3 px-4">
                                                <span className={trade.direction === 'LONG' ? 'text-brand-success' : 'text-brand-danger'}>{trade.direction === 'LONG' ? 'Лонг' : 'Шорт'}</span>
                                            </td>
                                            <td className={`py-3 px-4 font-mono ${trade.pnl && trade.pnl >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                                                {trade.pnl ? formatCurrency(trade.pnl) : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">{trade.status}</td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-brand-bg">
                                                <td colSpan={6} className="p-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                                        <div><p className="font-semibold text-brand-text-secondary">ID Ордера</p><p className="font-mono text-brand-text">{trade.orderId}</p></div>
                                                        <div><p className="font-semibold text-brand-text-secondary">Цена входа</p><p className="font-mono text-brand-text">{trade.entryPrice}</p></div>
                                                        {trade.closedAt && (
                                                            <div><p className="font-semibold text-brand-text-secondary">Время закрытия</p><p className="text-brand-text">{formatTimestamp(trade.closedAt)}</p></div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-brand-text-secondary">Нет зарегистрированных сделок</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
