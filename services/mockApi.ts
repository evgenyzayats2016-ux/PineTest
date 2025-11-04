
import type { Strategy, BacktestResult, Trade, UserSecret, UserProfile, OhlcvBar } from '../types';
import { MOCKED_USER_ID, NG_FUTURES_FIGI } from '../constants';

const STRATEGIES_KEY = 'pine_trader_mock_strategies';
const USER_SECRET_KEY = 'pine_trader_mock_secret';

// --- Initial Mock Data ---
const initialMockStrategies: Strategy[] = [
    {
        strategyId: 'mock-sma-cross-1',
        userId: MOCKED_USER_ID,
        name: 'Mock SMA Crossover',
        description: 'A simple SMA crossover strategy for backtesting.',
        instrumentFigi: NG_FUTURES_FIGI,
        timeframe: '1H',
        pineTsCode: `const shortMA = indicators.sma_short;\nconst longMA = indicators.sma_long;\n\nif (cross(shortMA, longMA)) {\n  strategy.entry("long");\n} else if (cross(longMA, shortMA)) {\n  strategy.close();\n}`,
        indicators: [
            { id: 'sma_short', type: 'SMA', parameters: { period: 10 } },
            { id: 'sma_long', type: 'SMA', parameters: { period: 30 } },
        ],
        createdAt: new Date('2023-10-01T10:00:00Z').toISOString(),
        updatedAt: new Date('2023-10-26T14:30:00Z').toISOString(),
        isActive: true,
        stopLoss: { type: 'PERCENTAGE', value: 2 },
        takeProfit: { type: 'PERCENTAGE', value: 5 },
    },
    {
        strategyId: 'mock-rsi-1',
        userId: MOCKED_USER_ID,
        name: 'Mock RSI Mean Reversion',
        description: 'A simple RSI mean reversion strategy.',
        instrumentFigi: NG_FUTURES_FIGI,
        timeframe: '15M',
        pineTsCode: `const rsi = indicators.rsi_main;\n\nif (rsi < 30) {\n  strategy.entry("long");\n} else if (rsi > 70) {\n  strategy.entry("short");\n}\n\nif(rsi > 55 && strategy.position === 'LONG') {\n    strategy.close();\n}\n\nif(rsi < 45 && strategy.position === 'SHORT') {\n    strategy.close();\n}`,
        indicators: [
            { id: 'rsi_main', type: 'RSI', parameters: { period: 14 } },
        ],
        createdAt: new Date('2023-09-15T18:00:00Z').toISOString(),
        updatedAt: new Date('2023-10-20T11:00:00Z').toISOString(),
        isActive: false,
        stopLoss: { type: 'TRAILING', value: 3 },
        takeProfit: { type: 'NONE', value: 0 },
    }
];

const generateMockTrades = (strategies: Strategy[]): Trade[] => {
    if (!strategies.length) return [];
    // FIX: Explicitly type the return value of the map function to `Trade` to resolve a type inference issue.
    return Array.from({ length: 25 }, (_, i): Trade => {
        const strategy = strategies[Math.floor(Math.random() * strategies.length)];
        const entryPrice = 70000 + Math.random() * 2000;
        const pnlPoints = Math.random() * 400 - 200;
        const exitPrice = entryPrice + pnlPoints;
        const pnl = pnlPoints * 10; // Simplified PnL
        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
        return {
            tradeId: `mock-trade-${i}`,
            userId: MOCKED_USER_ID,
            strategyId: strategy.strategyId,
            orderId: `mock-order-${i}`,
            figi: NG_FUTURES_FIGI,
            direction: Math.random() > 0.5 ? 'LONG' : 'SHORT',
            status: 'CLOSED',
            quantity: 1,
            entryPrice,
            exitPrice,
            pnl,
            pnlPoints,
            createdAt,
            closedAt: new Date(new Date(createdAt).getTime() + Math.random() * 60 * 60 * 1000).toISOString(),
        }
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};


// --- Helper Functions ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getStoredStrategies = (): Strategy[] => {
    try {
        const stored = localStorage.getItem(STRATEGIES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        localStorage.setItem(STRATEGIES_KEY, JSON.stringify(initialMockStrategies));
        return initialMockStrategies;
    } catch {
        return initialMockStrategies;
    }
};

const setStoredStrategies = (strategies: Strategy[]) => {
    localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
};

// --- Public API ---

export const fetchStrategies = async (): Promise<Strategy[]> => {
    console.log("Fetching mock strategies...");
    await delay(300);
    return getStoredStrategies();
};

export const fetchStrategyById = async (id: string): Promise<Strategy | undefined> => {
    console.log(`Fetching mock strategy ${id}...`);
    await delay(200);
    const strategies = getStoredStrategies();
    return strategies.find(s => s.strategyId === id);
};

export const saveStrategy = async (strategyData: Partial<Strategy>): Promise<Strategy> => {
    console.log("Saving mock strategy...", strategyData);
    await delay(500);
    const strategies = getStoredStrategies();
    const now = new Date().toISOString();

    if (strategyData.strategyId) { // Update
        let updatedStrategy: Strategy | undefined;
        const newStrategies = strategies.map(s => {
            if (s.strategyId === strategyData.strategyId) {
                updatedStrategy = { ...s, ...strategyData, updatedAt: now };
                return updatedStrategy;
            }
            return s;
        });
        setStoredStrategies(newStrategies);
        if (!updatedStrategy) throw new Error("Strategy not found for update");
        return updatedStrategy;
    } else { // Create
        const newStrategy: Strategy = {
            ...strategyData,
            strategyId: `mock-strategy-${Date.now()}`,
            userId: MOCKED_USER_ID,
            createdAt: now,
            updatedAt: now,
        } as Strategy; // Assume all required fields are present
        const newStrategies = [...strategies, newStrategy];
        setStoredStrategies(newStrategies);
        return newStrategy;
    }
};

export const toggleStrategyStatus = async (strategyId: string, isActive: boolean): Promise<Strategy> => {
    console.log(`Toggling mock strategy ${strategyId} to ${isActive}`);
    await delay(400);
    const strategies = getStoredStrategies();
    let updatedStrategy: Strategy | undefined;
    const newStrategies = strategies.map(s => {
        if (s.strategyId === strategyId) {
            updatedStrategy = { ...s, isActive, updatedAt: new Date().toISOString() };
            return updatedStrategy;
        }
        return s;
    });
    if (!updatedStrategy) throw new Error("Strategy not found");
    setStoredStrategies(newStrategies);
    return updatedStrategy;
};

export const duplicateStrategy = async (strategyId: string): Promise<Strategy> => {
    console.log(`Duplicating mock strategy ${strategyId}`);
    await delay(400);
    const strategies = getStoredStrategies();
    const originalStrategy = strategies.find(s => s.strategyId === strategyId);
    if (!originalStrategy) throw new Error("Strategy not found");

    const newStrategy: Strategy = {
        ...originalStrategy,
        name: `${originalStrategy.name} (Copy)`,
        strategyId: `mock-strategy-${Date.now()}`,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    
    setStoredStrategies([...strategies, newStrategy]);
    return newStrategy;
};

export const fetchTrades = async (): Promise<Trade[]> => {
    console.log("Fetching mock trades...");
    await delay(600);
    const strategies = getStoredStrategies();
    return generateMockTrades(strategies);
};

export const runBacktest = async (strategyId: string, startDate: string, endDate: string): Promise<BacktestResult> => {
    console.log(`Running mock backtest for ${strategyId}...`);
    const trades: Trade[] = Array.from({ length: 50 }, (_, i) => ({
        tradeId: `mock-trade-${i}`,
        userId: MOCKED_USER_ID,
        strategyId,
        orderId: `mock-order-${i}`,
        figi: NG_FUTURES_FIGI,
        direction: Math.random() > 0.5 ? 'LONG' : 'SHORT',
        status: 'CLOSED',
        quantity: 1,
        entryPrice: 70000 + Math.random() * 1000,
        exitPrice: 70000 + Math.random() * 1000 - 200,
        pnl: Math.random() * 14000 - 7000,
        pnlPoints: Math.random() * 200 - 100,
        createdAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
    }));
    
    await delay(1500);
    return {
        backtestId: `mock-backtest-${Date.now()}`,
        userId: MOCKED_USER_ID,
        strategyId,
        startDate,
        endDate,
        metrics: {
            totalPnl: Math.random() * 200000 - 50000,
            sharpeRatio: Math.random() * 2.5,
            maxDrawdown: Math.random() * 0.3,
            winRate: Math.random() * 0.4 + 0.3, // 30% to 70%
            totalTrades: Math.floor(Math.random() * 100) + 20,
            totalWins: 30,
            totalLosses: 20,
            grossProfit: 150000,
            grossLoss: -50000,
            profitFactor: 3,
            averageWin: 5000,
            averageLoss: -2500,
        },
        equityCurve: Array.from({ length: 100 }, (_, i) => ({
            date: new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            equity: 1000000 + (Math.random() * 10000 * i) - (i * 2000)
        })),
        tradeLog: trades,
    };
};

// --- Mock User Settings ---
export const fetchUserSecret = async (): Promise<UserSecret> => {
    await delay(150);
    const stored = localStorage.getItem(USER_SECRET_KEY);
    return stored ? JSON.parse(stored) : { tinkoffApiToken: null };
};

export const saveUserSecret = async (token: string): Promise<UserSecret> => {
    await delay(600);
    const secret = { tinkoffApiToken: token };
    localStorage.setItem(USER_SECRET_KEY, JSON.stringify(secret));
    return secret;
};

export const deleteUserSecret = async (): Promise<void> => {
    console.log("Deleting mock user secret...");
    await delay(300);
    localStorage.removeItem(USER_SECRET_KEY);
};

// --- Mock Tinkoff Services ---

/**
 * Simulates fetching historical candle data from Tinkoff API.
 * In a real app, this would make an actual HTTP request.
 */
export const fetchTinkoffCandles = async (figi: string, token: string): Promise<OhlcvBar[]> => {
    console.log(`Simulating fetch for FIGI: ${figi} with token.`);
    await delay(800);

    if (!token) {
        throw new Error("API токен не предоставлен. Пожалуйста, добавьте токен в настройках.");
    }
    
    // Generate some random realistic-looking data
    const candles: OhlcvBar[] = [];
    let lastClose = Math.random() * 500 + 200; // Start price between 200 and 700
    const now = Date.now();

    for (let i = 20; i > 0; i--) {
        const timestamp = now - i * 60 * 60 * 1000; // Hourly candles for the last 20 hours
        const open = lastClose;
        const change = (Math.random() - 0.48) * open * 0.05; // Up to 5% change per hour
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * open * 0.01;
        const low = Math.min(open, close) - Math.random() * open * 0.01;
        const volume = Math.floor(Math.random() * 100000) + 5000;
        
        candles.push({ timestamp, open, high, low, close, volume });
        lastClose = close;
    }

    return candles.reverse(); // Newest first
};
