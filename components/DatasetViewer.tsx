import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Spinner from './shared/Spinner';
import type { HistoricalDataset, OhlcvBar } from '../types';
import { getOhlcvData } from '../services/dataStore';

interface DatasetViewerProps {
    dataset: HistoricalDataset;
}

const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);

const DatasetViewer: React.FC<DatasetViewerProps> = ({ dataset }) => {
    const [ohlcvData, setOhlcvData] = useState<OhlcvBar[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getOhlcvData(dataset.id);
                if (!data) {
                    throw new Error("Не удалось загрузить данные котировок.");
                }
                setOhlcvData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [dataset.id]);

    if (loading) {
        return <Spinner />;
    }
    if (error) {
        return <p className="text-brand-danger text-center">{error}</p>;
    }
    if (!ohlcvData) {
        return <p className="text-brand-text-secondary text-center">Нет данных для отображения.</p>;
    }
    
    const chartData = ohlcvData.map(bar => ({
        date: new Date(bar.timestamp).toLocaleDateString('ru-RU'),
        close: bar.close
    }));

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-lg font-semibold mb-2 text-brand-text">График цен закрытия (Close)</h4>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-surface-light)" />
                            <XAxis dataKey="date" stroke="var(--color-brand-text-secondary)" />
                            <YAxis stroke="var(--color-brand-text-secondary)" domain={['auto', 'auto']} tickFormatter={(tick) => formatCurrency(tick as number)} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--color-brand-surface)', border: '1px solid var(--color-brand-surface-light)' }} 
                                formatter={(value) => [formatCurrency(value as number), "Close"]}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="close" name="Close" stroke="var(--color-brand-accent)" dot={false} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div>
                 <h4 className="text-lg font-semibold mb-2 text-brand-text">Данные котировок</h4>
                  <div className="overflow-auto max-h-80 border border-brand-surface-light rounded-lg">
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
                            {ohlcvData.map(bar => (
                                <tr key={bar.timestamp} className="border-b border-brand-surface-light last:border-b-0">
                                    <td className="py-2 px-3">{new Date(bar.timestamp).toLocaleString('ru-RU')}</td>
                                    <td className="py-2 px-3">{bar.open}</td>
                                    <td className="py-2 px-3">{bar.high}</td>
                                    <td className="py-2 px-3">{bar.low}</td>
                                    <td className="py-2 px-3">{bar.close}</td>
                                    <td className="py-2 px-3">{bar.volume ?? 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DatasetViewer;
