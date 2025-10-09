
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, Cell } from 'recharts';
import Papa from 'papaparse';
import Card from './shared/Card';
import Button from './shared/Button';
import Spinner from './shared/Spinner';
import type { Strategy, BacktestResult, Trade, HistoricalDataset } from '../types';
import { fetchStrategies, runBacktest as runMockBacktest } from '../services/mockApi';
import { runLocalBacktest } from '../services/backtestEngine';
import { getDatasets, getOhlcvData } from '../services/dataStore';


const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);

const formatPoints = (value: number) => 
    new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);

const formatPointsDelta = (value: number) => {
    if (value === 0 || !value) return '0.000 пт.';
    const formatted = new Intl.NumberFormat('ru-RU', { 
        minimumFractionDigits: 3, 
        maximumFractionDigits: 3,
        signDisplay: 'exceptZero' 
    }).format(value);
    return `${formatted} пт.`;
};

const MetricChartCard: React.FC<{
  value: number;
  name: string;
  color: string;
  domain: [number, number];
  formatter: (value: number) => string;
}> = ({ value, name, color, domain, formatter }) => {
  const data = [{ name, value }];

  return (
    <div className="text-center h-full flex flex-col justify-between">
      <div className="w-full h-28">
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={domain} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={5} fill={color} />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-current text-brand-text font-semibold text-xl">
              {formatter(value)}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-brand-text-secondary mt-1">{name}</p>
    </div>
  );
};


const ResultsMetrics: React.FC<{ metrics: BacktestResult['metrics'] }> = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center p-4 bg-brand-surface-light rounded-lg">
        <div className="text-center py-4">
            <p className="text-sm text-brand-text-secondary">Общий P&L</p>
            <p className={`text-2xl font-semibold ${metrics.totalPnl >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                {formatCurrency(metrics.totalPnl)}
            </p>
        </div>
        
        <MetricChartCard 
          name="Коэф. Шарпа"
          value={metrics.sharpeRatio}
          domain={[0, 3]}
          color="var(--color-brand-accent)"
          formatter={(v) => v.toFixed(2)}
        />
        
        <MetricChartCard 
          name="Макс. просадка"
          value={metrics.maxDrawdown * 100}
          domain={[0, 50]}
          color="var(--color-brand-danger)"
          formatter={(v) => `${v.toFixed(1)}%`}
        />
        
        <MetricChartCard 
          name="Процент побед"
          value={metrics.winRate * 100}
          domain={[0, 100]}
          color="var(--color-brand-success)"
          formatter={(v) => `${v.toFixed(1)}%`}
        />

        <div className="text-center py-4">
            <p className="text-sm text-brand-text-secondary">Всего сделок</p>
            <p className="text-2xl font-semibold text-brand-text">{metrics.totalTrades}</p>
        </div>
    </div>
);

const DetailedMetrics: React.FC<{ metrics: BacktestResult['metrics'] }> = ({ metrics }) => (
    <Card title="Детализированная статистика">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Winning Trades */}
            <div className="space-y-3">
                <h4 className="text-lg font-semibold text-brand-success border-b border-brand-surface-light pb-2">Прибыльные сделки</h4>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Всего прибыльных сделок</span>
                    <span className="font-semibold">{metrics.totalWins}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Общая прибыль</span>
                    <span className="font-semibold">{formatCurrency(metrics.grossProfit)} <span className="text-xs text-brand-text-secondary">({formatPointsDelta(metrics.grossProfitPoints)})</span></span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Средняя прибыль</span>
                    <span className="font-semibold">{formatCurrency(metrics.averageWin)} <span className="text-xs text-brand-text-secondary">({formatPointsDelta(metrics.averageWinPoints)})</span></span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Макс. прибыль в сделке</span>
                    <span className="font-semibold">{formatCurrency(metrics.largestWin)} <span className="text-xs text-brand-text-secondary">({formatPointsDelta(metrics.largestWinPoints)})</span></span>
                </div>
            </div>
            {/* Losing Trades */}
            <div className="space-y-3">
                <h4 className="text-lg font-semibold text-brand-danger border-b border-brand-surface-light pb-2">Убыточные сделки</h4>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Всего убыточных сделок</span>
                    <span className="font-semibold">{metrics.totalLosses}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Общий убыток</span>
                    <span className="font-semibold">{formatCurrency(metrics.grossLoss)} <span className="text-xs text-brand-text-secondary">({formatPointsDelta(metrics.grossLossPoints)})</span></span>
                </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Средний убыток</span>
                    <span className="font-semibold">{formatCurrency(metrics.averageLoss)} <span className="text-xs text-brand-text-secondary">({formatPointsDelta(metrics.averageLossPoints)})</span></span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-brand-text-secondary">Макс. убыток в сделке</span>
                    <span className="font-semibold">{formatCurrency(metrics.largestLoss)} <span className="text-xs text-brand-text-secondary">({formatPointsDelta(metrics.largestLossPoints)})</span></span>
                </div>
            </div>
        </div>
        <div className="mt-6 pt-4 border-t border-brand-surface-light flex justify-between items-center">
            <h4 className="text-base font-semibold">Профит-фактор</h4>
            <span className={`text-xl font-bold ${metrics.profitFactor >= 1 ? 'text-brand-success' : 'text-brand-danger'}`}>
                {isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}
            </span>
        </div>
    </Card>
);

const PnlDistributionChart: React.FC<{ trades: Trade[] }> = ({ trades }) => {
    const pnlData = useMemo(() => {
        const closedTrades = trades.filter(t => t.status === 'CLOSED' && typeof t.pnl === 'number');
        if (closedTrades.length === 0) return [];

        const pnls = closedTrades.map(t => t.pnl!);
        const minPnl = Math.min(...pnls);
        const maxPnl = Math.max(...pnls);

        if (minPnl === maxPnl) return [];

        const numBins = 20;
        const binSize = (maxPnl - minPnl) / numBins;
        
        const bins = Array.from({ length: numBins }, (_, i) => {
            const binMin = minPnl + i * binSize;
            return {
                name: `${Math.round(binMin)}..${Math.round(binMin + binSize)}`,
                count: 0,
                isProfit: binMin + binSize / 2 >= 0,
            };
        });

        pnls.forEach(pnl => {
            let binIndex = Math.floor((pnl - minPnl) / binSize);
            // Handle edge case where pnl is exactly maxPnl
            if (binIndex === numBins) binIndex = numBins - 1;
            if (bins[binIndex]) {
                bins[binIndex].count++;
            }
        });

        return bins;
    }, [trades]);

    if (pnlData.length === 0) {
        return <p className="text-sm text-brand-text-secondary text-center py-8">Недостаточно данных для построения гистограммы P&L.</p>;
    }
    
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={pnlData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-surface-light)" />
                    <XAxis dataKey="name" stroke="var(--color-brand-text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--color-brand-text-secondary)" allowDecimals={false} />
                    <Tooltip
                        cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                        contentStyle={{ backgroundColor: 'var(--color-brand-surface)', border: '1px solid var(--color-brand-surface-light)' }}
                        formatter={(value, name) => [value, 'Сделок']}
                        labelFormatter={(label) => `P&L: ${label}`}
                    />
                    <Bar dataKey="count">
                        {pnlData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isProfit ? 'var(--color-brand-success)' : 'var(--color-brand-danger)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const Backtesting: React.FC = () => {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [customDatasets, setCustomDatasets] = useState<HistoricalDataset[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<string>('');
    const [dataSource, setDataSource] = useState<'default' | 'custom'>('default');
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState('2023-12-31');
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<BacktestResult | null>(null);
    const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

    const toDate = (value: string | undefined): Date | null => {
        if (!value) return null;
        return new Date(value);
    };

    useEffect(() => {
        const loadInitialData = async () => {
            const [strategiesData, datasetsData] = await Promise.all([
                fetchStrategies(),
                getDatasets()
            ]);
            
            setStrategies(strategiesData);
            if (strategiesData.length > 0) {
                setSelectedStrategy(strategiesData[0].strategyId);
            }

            setCustomDatasets(datasetsData);
            if (datasetsData.length > 0) {
                setSelectedDatasetId(datasetsData[0].id);
            }
        };
        loadInitialData();
    }, []);

    const handleRunBacktest = async () => {
        if (!selectedStrategy) return;
        
        setIsRunning(true);
        setResults(null);

        try {
            let backtestResult: BacktestResult;
            const strategyToBacktest = strategies.find(s => s.strategyId === selectedStrategy);
            if (!strategyToBacktest) throw new Error("Selected strategy not found.");

            if (dataSource === 'custom' && selectedDatasetId) {
                const ohlcvData = await getOhlcvData(selectedDatasetId);
                if (!ohlcvData) throw new Error("Could not load OHLCV data for the selected dataset.");
                const datasetInfo = customDatasets.find(d => d.id === selectedDatasetId);
                backtestResult = runLocalBacktest(strategyToBacktest, ohlcvData, datasetInfo?.instrumentName || 'Custom');
            } else {
                backtestResult = await runMockBacktest(selectedStrategy, startDate, endDate);
            }
            setResults(backtestResult);
        } catch (error) {
            console.error("Backtest failed:", error);
            // Here you could show a toast notification with the error
        } finally {
            setIsRunning(false);
        }
    };

    const handleExportResults = () => {
        if (!results) return;

        // 1. Prepare Metrics Data
        const metricsData = [
            { Metric: 'Total PnL', Value: results.metrics.totalPnl },
            { Metric: 'Sharpe Ratio', Value: results.metrics.sharpeRatio.toFixed(4) },
            { Metric: 'Max Drawdown', Value: results.metrics.maxDrawdown.toFixed(4) },
            { Metric: 'Win Rate', Value: results.metrics.winRate.toFixed(4) },
            { Metric: 'Total Trades', Value: results.metrics.totalTrades },
        ];
        const metricsCsv = Papa.unparse(metricsData);

        // 2. Prepare Trade Log Data
        const tradeLogData = results.tradeLog.map(trade => ({
            'Trade ID': trade.tradeId,
            'Created At': trade.createdAt,
            'Closed At': trade.closedAt || 'N/A',
            'Direction': trade.direction,
            'Quantity': trade.quantity,
            'Status': trade.status,
            'Entry Price': trade.entryPrice,
            'Exit Price': trade.exitPrice || 'N/A',
            'PnL': trade.pnl ?? 'N/A',
        }));
        const tradeLogCsv = Papa.unparse(tradeLogData);

        // 3. Combine CSVs
        const strategyName = strategies.find(s => s.strategyId === results.strategyId)?.name || 'Unknown Strategy';
        const finalCsv = `Backtest Metrics for Strategy: ${strategyName}\n\n` +
                         `${metricsCsv}\n\n\n` +
                         `Trade Log\n\n` +
                         `${tradeLogCsv}`;
        
        // 4. Create and trigger download
        const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `backtest_results_${results.strategyId}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handleTradeRowClick = (tradeId: string) => {
        setExpandedTradeId(prevId => (prevId === tradeId ? null : tradeId));
    };

    return (
        <div className="space-y-6">
            <Card title="Запустить бектест">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-1">Стратегия</label>
                        <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} className="block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent">
                            {strategies.map(s => <option key={s.strategyId} value={s.strategyId}>{s.name} ({s.timeframe})</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-2">Источник данных</label>
                        <div className="flex space-x-4">
                             <label className="flex items-center">
                                <input type="radio" name="dataSource" value="default" checked={dataSource === 'default'} onChange={() => setDataSource('default')} className="form-radio h-4 w-4 text-brand-accent bg-brand-surface-light border-brand-surface-light focus:ring-brand-accent"/>
                                <span className="ml-2 text-sm">Данные по умолчанию</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="dataSource" value="custom" checked={dataSource === 'custom'} onChange={() => setDataSource('custom')} className="form-radio h-4 w-4 text-brand-accent bg-brand-surface-light border-brand-surface-light focus:ring-brand-accent" disabled={customDatasets.length === 0} />
                                <span className="ml-2 text-sm">Библиотека пользователя</span>
                            </label>
                        </div>
                    </div>

                    {dataSource === 'custom' ? (
                        <div>
                             <label className="block text-sm font-medium text-brand-text-secondary mb-1">Датасет</label>
                             <select value={selectedDatasetId} onChange={e => setSelectedDatasetId(e.target.value)} className="block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent" disabled={customDatasets.length === 0}>
                                {customDatasets.length > 0 ? (
                                    customDatasets.map(d => <option key={d.id} value={d.id}>{`${d.instrumentName} ${d.timeframe} (${new Date(d.startDate).toLocaleDateString()})`}</option>)
                                 ) : (
                                    <option>Нет доступных датасетов</option>
                                 )}
                            </select>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-brand-text-secondary">Дата начала</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-brand-text-secondary">Дата окончания</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent" />
                            </div>
                        </div>
                    )}
                </div>
                 <div className="mt-6 flex justify-end">
                    <Button onClick={handleRunBacktest} isLoading={isRunning} disabled={isRunning || (dataSource === 'custom' && !selectedDatasetId)}>Запустить бектест</Button>
                </div>
            </Card>

            {isRunning && <Spinner />}

            {results && (
                <Card 
                    title={`Результаты бектеста: ${strategies.find(s => s.strategyId === results.strategyId)?.name}`}
                    action={
                        <Button variant="secondary" onClick={handleExportResults}>
                            Экспорт результатов
                        </Button>
                    }
                >
                     {dataSource === 'custom' && <p className="text-sm text-brand-text-secondary mb-4 -mt-2">Использовался пользовательский датасет: {customDatasets.find(d=>d.id === selectedDatasetId)?.instrumentName}</p>}
                    <div className="space-y-6">
                        <ResultsMetrics metrics={results.metrics} />
                        <DetailedMetrics metrics={results.metrics} />
                        <div>
                            <h4 className="text-lg font-semibold mb-2 text-brand-text">Кривая капитала</h4>
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer>
                                    <LineChart data={results.equityCurve} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-surface-light)" />
                                        <XAxis dataKey="date" stroke="var(--color-brand-text-secondary)" />
                                        <YAxis stroke="var(--color-brand-text-secondary)" domain={['auto', 'auto']} tickFormatter={(tick) => formatCurrency(tick as number)} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-brand-surface)', border: '1px solid var(--color-brand-surface-light)' }} 
                                            formatter={(value) => [formatCurrency(value as number), "Капитал"]}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="equity" name="Капитал" stroke="var(--color-brand-accent)" dot={false} strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-lg font-semibold mb-2 text-brand-text">Распределение P&L сделок</h4>
                                <PnlDistributionChart trades={results.tradeLog} />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold mb-2 text-brand-text">Лог сделок</h4>
                                <div className="overflow-x-auto max-h-80">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-brand-text-secondary uppercase sticky top-0 bg-brand-surface">
                                            <tr>
                                                <th className="py-3 px-4">Дата</th>
                                                <th className="py-3 px-4">Направление</th>
                                                <th className="py-3 px-4">Цена входа</th>
                                                <th className="py-3 px-4">Цена выхода</th>
                                                <th className="py-3 px-4">P&L</th>
                                                <th className="py-3 px-4">P&L (пункты)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.tradeLog.map(trade => (
                                                <React.Fragment key={trade.tradeId}>
                                                    <tr
                                                        className="border-b border-brand-surface-light hover:bg-brand-surface-light cursor-pointer transition-colors"
                                                        onClick={() => handleTradeRowClick(trade.tradeId)}
                                                    >
                                                        <td className="py-3 px-4">{toDate(trade.createdAt)?.toLocaleDateString('ru-RU')}</td>
                                                        <td className="py-3 px-4"><span className={trade.direction === 'LONG' ? 'text-brand-success' : 'text-brand-danger'}>{trade.direction === 'LONG' ? 'Лонг' : 'Шорт'}</span></td>
                                                        <td className="py-3 px-4">{formatPoints(trade.entryPrice)}</td>
                                                        <td className="py-3 px-4">{trade.exitPrice ? formatPoints(trade.exitPrice) : ''}</td>
                                                        <td className={`py-3 px-4 font-mono ${trade.pnl && trade.pnl >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>{trade.pnl ? formatCurrency(trade.pnl) : ''}</td>
                                                        <td className={`py-3 px-4 font-mono ${trade.pnlPoints && trade.pnlPoints >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>{trade.pnlPoints ? formatPointsDelta(trade.pnlPoints) : ''}</td>
                                                    </tr>
                                                    {expandedTradeId === trade.tradeId && (
                                                        <tr className="bg-brand-bg">
                                                            <td colSpan={6} className="p-4">
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                                                    <div>
                                                                        <p className="font-semibold text-brand-text-secondary">ID Ордера</p>
                                                                        <p className="font-mono text-brand-text">{trade.orderId}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-brand-text-secondary">ID Стратегии</p>
                                                                        <p className="font-mono text-brand-text">{trade.strategyId}</p>
                                                                    </div>
                                                                    {trade.closedAt && (
                                                                        <div>
                                                                            <p className="font-semibold text-brand-text-secondary">Время закрытия</p>
                                                                            <p className="text-brand-text">{toDate(trade.closedAt)?.toLocaleString('ru-RU')}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Backtesting;
