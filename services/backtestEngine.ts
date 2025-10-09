import type { OhlcvBar, BacktestResult, BacktestMetrics, Trade, Strategy, TradeDirection } from '../types';
import { MOCK_NG_MULTIPLIER } from '../constants';

// --- INDICATOR CALCULATION LIBRARY ---
// For modularity, these would typically be in a separate file.

const calculateEMA = (data: number[], period: number): (number | null)[] => {
    if (period > data.length || period <= 0) return Array(data.length).fill(null);
    const result: (number | null)[] = Array(period - 1).fill(null);
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(ema);
    for (let i = period; i < data.length; i++) {
        ema = (data[i] - ema) * multiplier + ema;
        result.push(ema);
    }
    return result;
};

const calculateSMA = (data: number[], period: number): (number | null)[] => {
    if (period > data.length || period <= 0) return Array(data.length).fill(null);
    const result: (number | null)[] = Array(period - 1).fill(null);
    let sum = data.slice(0, period).reduce((a, b) => a + b, 0);
    result.push(sum / period);
    for (let i = period; i < data.length; i++) {
        sum = sum - data[i - period] + data[i];
        result.push(sum / period);
    }
    return result;
};

const calculateRSI = (data: number[], period: number): (number | null)[] => {
    if (period >= data.length || period <= 0) return Array(data.length).fill(null);
    const result: (number | null)[] = Array(period).fill(null);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const diff = data[i] - data[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    if (avgLoss === 0) {
       result[period] = 100;
    } else {
       const rs = avgGain / avgLoss;
       result[period] = 100 - (100 / (1 + rs));
    }

    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
        if (avgLoss === 0) {
            result.push(100);
        } else {
            const rs = avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        }
    }
    return Array(data.length - result.length).fill(null).concat(result);
};


const calculateStdev = (data: number[], period: number): (number | null)[] => {
    if (period > data.length || period <= 0) return Array(data.length).fill(null);
    const result: (number | null)[] = Array(period - 1).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
        result.push(Math.sqrt(variance));
    }
    return result;
}

const calculateBB = (data: number[], period: number, stdDev: number): { upper: (number|null)[], middle: (number|null)[], lower: (number|null)[] } => {
    const middle = calculateSMA(data, period);
    const stdev = calculateStdev(data, period);
    const upper = middle.map((val, i) => (val === null || stdev[i] === null) ? null : val + stdev[i]! * stdDev);
    const lower = middle.map((val, i) => (val === null || stdev[i] === null) ? null : val - stdev[i]! * stdDev);
    return { upper, middle, lower };
}

const calculateMACD = (data: number[], fast: number, slow: number, signal: number): { macd: (number|null)[], signal: (number|null)[], hist: (number|null)[] } => {
    const emaFast = calculateEMA(data, fast);
    const emaSlow = calculateEMA(data, slow);
    const macdLine = emaFast.map((val, i) => (val === null || emaSlow[i] === null) ? null : val - emaSlow[i]!);
    // Filter out nulls before calculating signal line EMA
    const validMacdValues = macdLine.filter((v): v is number => v !== null);
    const signalLine = calculateEMA(validMacdValues, signal);
    
    // Align signal line with original macd line length
    const firstMacdIndex = macdLine.findIndex(v => v !== null);
    const alignedSignal = [
        ...Array(firstMacdIndex).fill(null),
        ...signalLine
    ];

    const hist = macdLine.map((val, i) => (val === null || alignedSignal[i] === null) ? null : val - alignedSignal[i]!);

    return { macd: macdLine, signal: alignedSignal, hist };
}


// --- DYNAMIC PINETS BACKTEST ENGINE ---

export const runLocalBacktest = (strategy: Strategy, ohlcvData: OhlcvBar[], instrumentName: string): BacktestResult => {
    const tradeLog: Trade[] = [];
    const equityCurve: { date: string, equity: number }[] = [];
    
    let balance = 1_000_000;
    let equity = 1_000_000;
    let openPosition: (Trade & { trailingStop?: number }) | null = null;
    let tradeCounter = 0;
    let peakEquity = 1_000_000;
    let maxDrawdown = 0;

    // --- Pre-calculate all data series ---
    const openPrices = ohlcvData.map(bar => bar.open);
    const highPrices = ohlcvData.map(bar => bar.high);
    const lowPrices = ohlcvData.map(bar => bar.low);
    const closePrices = ohlcvData.map(bar => bar.close);

    const indicatorData: { [id: string]: (number | null)[] } = {};
    strategy.indicators.forEach(ind => {
        // Handle potential invalid parameters
        const params = Object.fromEntries(Object.entries(ind.parameters).map(([key, value]) => [key, Number(value) || 1]));

        switch (ind.type) {
            case 'SMA':
                indicatorData[ind.id] = calculateSMA(closePrices, params.period);
                break;
            case 'RSI':
                indicatorData[ind.id] = calculateRSI(closePrices, params.period);
                break;
            case 'BB':
                const bb = calculateBB(closePrices, params.period, params.stdDev);
                indicatorData[`${ind.id}_upper`] = bb.upper;
                indicatorData[`${ind.id}_middle`] = bb.middle;
                indicatorData[`${ind.id}_lower`] = bb.lower;
                break;
            case 'MACD':
                const macd = calculateMACD(closePrices, params.fastLength, params.slowLength, params.signalSmoothing);
                indicatorData[`${ind.id}_macd`] = macd.macd;
                indicatorData[`${ind.id}_signal`] = macd.signal;
                indicatorData[`${ind.id}_hist`] = macd.hist;
                break;
        }
    });

    // --- Sandbox environment setup ---
    const createSeriesProxy = (series: (number | null)[], currentIndex: number) => {
        return new Proxy(series, {
            get(target, prop, receiver) {
                if (prop === Symbol.toPrimitive || prop === 'valueOf') {
                    return () => target[currentIndex];
                }
                if (typeof prop === 'string' && !isNaN(parseInt(prop, 10))) {
                    const offset = parseInt(prop, 10);
                    const index = currentIndex - offset;
                    return index >= 0 && index < target.length ? target[index] : null;
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    };

    const cross = (series1: any, series2: any): boolean => {
        const s1_prev = series1[1];
        const s1_curr = series1[0];
        const s2_prev = series2[1];
        const s2_curr = series2[0];
        if (s1_prev === null || s1_curr === null || s2_prev === null || s2_curr === null) return false;
        return s1_prev <= s2_prev && s1_curr > s2_curr;
    };
    
    let userStrategyFn: Function;
    try {
        userStrategyFn = new Function('open', 'high', 'low', 'close', 'indicators', 'strategy', 'cross', strategy.pineTsCode);
    } catch (e: any) {
        throw new Error(`Syntax error in strategy code: ${e.message}`);
    }

    // --- Main Backtest Loop ---
    for (let i = 1; i < ohlcvData.length; i++) {
        const bar = ohlcvData[i];

        const closeTrade = (exitPrice: number, timestamp: number) => {
            if (!openPosition) return;
            const pnlPoints = (exitPrice - openPosition.entryPrice) * (openPosition.direction === 'LONG' ? 1 : -1);
            const pnl = pnlPoints * openPosition.quantity * MOCK_NG_MULTIPLIER;
            const closedTrade: Trade = { ...openPosition, status: 'CLOSED', exitPrice, pnl, pnlPoints, closedAt: new Date(timestamp).toISOString() };
            const index = tradeLog.findIndex(t => t.tradeId === closedTrade.tradeId);
            if(index > -1) tradeLog[index] = closedTrade;
            balance += pnl;
            openPosition = null;
        };
        
        // 1. Check Risk Management (SL/TP)
        if (openPosition) {
            let slPrice: number | null = null, tpPrice: number | null = null;
            const dirMultiplier = openPosition.direction === 'LONG' ? 1 : -1;

            switch (strategy.stopLoss.type) {
                case 'FIXED_PRICE': slPrice = strategy.stopLoss.value; break;
                case 'PERCENTAGE': slPrice = openPosition.entryPrice * (1 - (strategy.stopLoss.value / 100) * dirMultiplier); break;
                case 'TRAILING':
                    const offset = (strategy.stopLoss.value / 100) * openPosition.entryPrice;
                    if (openPosition.direction === 'LONG') {
                        openPosition.trailingStop = Math.max(openPosition.trailingStop!, bar.high - offset);
                    } else {
                        openPosition.trailingStop = Math.min(openPosition.trailingStop!, bar.low + offset);
                    }
                    slPrice = openPosition.trailingStop;
                    break;
            }

            switch (strategy.takeProfit.type) {
                case 'FIXED_PRICE': tpPrice = strategy.takeProfit.value; break;
                case 'PERCENTAGE': tpPrice = openPosition.entryPrice * (1 + (strategy.takeProfit.value / 100) * dirMultiplier); break;
            }

            const hasExited = ((): boolean => {
                if (openPosition?.direction === 'LONG') {
                    if (tpPrice !== null && bar.high >= tpPrice) { closeTrade(tpPrice, bar.timestamp); return true; }
                    if (slPrice !== null && bar.low <= slPrice) { closeTrade(slPrice, bar.timestamp); return true; }
                } else { // SHORT
                    if (tpPrice !== null && bar.low <= tpPrice) { closeTrade(tpPrice, bar.timestamp); return true; }
                    if (slPrice !== null && bar.high >= slPrice) { closeTrade(slPrice, bar.timestamp); return true; }
                }
                return false;
            })();
            if(hasExited) continue;
        }
        
        // 2. Prepare and run strategy code
        const sandboxedStrategy = {
            entry: (direction: 'long' | 'short', _id?: string) => {
                if (openPosition) return;
                tradeCounter++;
                const newTrade: (Trade & { trailingStop?: number }) = {
                    tradeId: `ltrade-${tradeCounter}`,
                    // FIX: Add missing userId to satisfy Trade type
                    userId: strategy.userId,
                    strategyId: strategy.strategyId, 
                    orderId: `lord-${tradeCounter}`,
                    figi: strategy.instrumentFigi, direction: direction.toUpperCase() as TradeDirection, status: 'OPEN', quantity: 1,
                    entryPrice: bar.close, createdAt: new Date(bar.timestamp).toISOString(),
                };
                if (strategy.stopLoss.type === 'TRAILING' && strategy.stopLoss.value > 0) {
                    const offset = (strategy.stopLoss.value / 100) * bar.close;
                    newTrade.trailingStop = newTrade.direction === 'LONG' ? bar.close - offset : bar.close + offset;
                }
                openPosition = newTrade;
                tradeLog.push(openPosition);
            },
            close: (_id?: string) => {
                if (!openPosition) return;
                closeTrade(bar.close, bar.timestamp);
            }
        };

        const sandboxedIndicators = new Proxy({}, {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && indicatorData[prop]) {
                    return createSeriesProxy(indicatorData[prop], i);
                }
                return Reflect.get(target, prop, receiver);
            }
        });

        try {
            userStrategyFn(
                createSeriesProxy(openPrices, i), createSeriesProxy(highPrices, i),
                createSeriesProxy(lowPrices, i), createSeriesProxy(closePrices, i),
                sandboxedIndicators, sandboxedStrategy, cross
            );
        } catch (e: any) {
            console.error(`Runtime error in strategy at bar ${i} (timestamp: ${bar.timestamp}):`, e);
            // Optional: You could create a result object indicating the error
            break; // Stop the backtest on user code error to prevent further issues
        }

        // 3. Update Equity & Drawdown
        const pnlFromOpenPosition = openPosition ? ((bar.close - openPosition.entryPrice) * (openPosition.direction === 'LONG' ? 1 : -1)) * openPosition.quantity * MOCK_NG_MULTIPLIER : 0;
        equity = balance + pnlFromOpenPosition;
        equityCurve.push({ date: new Date(bar.timestamp).toISOString().split('T')[0], equity });
        peakEquity = Math.max(peakEquity, equity);
        const drawdown = (peakEquity - equity) / peakEquity;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    // --- Final Metrics Calculation ---
    const closedTrades = tradeLog.filter(t => t.status === 'CLOSED');
    let totalWins = 0, totalLosses = 0, grossProfit = 0, grossLoss = 0, grossProfitPoints = 0, grossLossPoints = 0;
    let largestWin = 0, largestLoss = 0, largestWinPoints = 0, largestLossPoints = 0;

    for (const trade of closedTrades) {
        if (trade.pnl === undefined || trade.pnlPoints === undefined) continue;
        if (trade.pnl > 0) {
            totalWins++; grossProfit += trade.pnl; grossProfitPoints += trade.pnlPoints;
            if (trade.pnl > largestWin) { largestWin = trade.pnl; largestWinPoints = trade.pnlPoints; }
        } else {
            totalLosses++; grossLoss += trade.pnl; grossLossPoints += trade.pnlPoints;
            if (trade.pnl < largestLoss) { largestLoss = trade.pnl; largestLossPoints = trade.pnlPoints; }
        }
    }
    
    const metrics: BacktestMetrics = {
        totalPnl: equity - 1_000_000,
        totalPnlPoints: grossProfitPoints + grossLossPoints,
        sharpeRatio: Math.random() * 2, // Mocked for now, requires risk-free rate and stddev of returns
        maxDrawdown,
        winRate: closedTrades.length > 0 ? totalWins / closedTrades.length : 0,
        totalTrades: tradeLog.length,
        totalWins, totalLosses, grossProfit, grossLoss,
        grossProfitPoints, grossLossPoints,
        profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : Infinity,
        averageWin: totalWins > 0 ? grossProfit / totalWins : 0,
        averageLoss: totalLosses > 0 ? grossLoss / totalLosses : 0,
        averageWinPoints: totalWins > 0 ? grossProfitPoints / totalWins : 0,
        averageLossPoints: totalLosses > 0 ? grossLossPoints / totalLosses : 0,
        largestWin, largestLoss, largestWinPoints, largestLossPoints,
    };

    return {
        backtestId: `lback-${Date.now()}`,
        userId: strategy.userId,
        strategyId: strategy.strategyId,
        startDate: new Date(ohlcvData[0].timestamp).toISOString(),
        endDate: new Date(ohlcvData[ohlcvData.length-1].timestamp).toISOString(),
        metrics,
        tradeLog,
        equityCurve
    };
};
