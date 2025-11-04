
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt: string;
  settings?: {
    theme?: 'dark' | 'light';
  };
}

export interface UserSecret {
  tinkoffApiToken: string | null;
}

export type Timeframe = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

export interface Indicator {
  id: string; 
  type: string; 
  parameters: Record<string, number>; 
}

export interface StopLoss {
    type: 'FIXED_PRICE' | 'PERCENTAGE' | 'TRAILING' | 'NONE';
    value: number;
}
export interface TakeProfit {
    type: 'FIXED_PRICE' | 'PERCENTAGE' | 'NONE';
    value: number;
}

export interface Strategy {
  strategyId: string;
  userId: string;
  name: string;
  description: string;
  instrumentFigi: string;
  timeframe: Timeframe;
  pineTsCode: string;
  indicators: Indicator[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  stopLoss: StopLoss;
  takeProfit: TakeProfit;
}

export interface StrategyState {
  position: 'FLAT' | 'LONG' | 'SHORT';
  entryPrice?: number;
  currentStopLoss?: number;
  currentTakeProfit?: number;
  lastSignal?: string;
  updatedAt: string;
}

export interface StrategyEvent {
    eventId: string;
    timestamp: string;
    eventType: 'SIGNAL_LONG' | 'SIGNAL_SHORT' | 'ORDER_SENT' | 'ORDER_FILLED' | 'STATE_UPDATED';
    payload: Record<string, any>;
}


export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'OPEN' | 'CLOSED' | 'ERROR';

export interface Trade {
  tradeId: string;
  userId: string;
  strategyId: string;
  orderId: string;
  figi: string;
  direction: TradeDirection;
  status: TradeStatus;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  pnlPoints?: number;
  createdAt: string;
  closedAt?: string;
}

export interface BacktestResult {
  backtestId: string;
  userId: string;
  strategyId: string;
  startDate: string;
  endDate: string;
  metrics: BacktestMetrics;
  equityCurve: { date: string; equity: number }[];
  tradeLog: Trade[];
}

export interface BacktestMetrics {
  totalPnl: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  totalPnlPoints?: number;
  totalWins?: number;
  totalLosses?: number;
  grossProfit?: number;
  grossLoss?: number;
  grossProfitPoints?: number;
  grossLossPoints?: number;
  profitFactor?: number;
  averageWin?: number;
  averageLoss?: number;
  averageWinPoints?: number;
  averageLossPoints?: number;
  largestWin?: number;
  largestLoss?: number;
  largestWinPoints?: number;
  largestLossPoints?: number;
}

export interface ExecutionLog {
    logId: string;
    userId: string;
    strategyId: string;
    timestamp: string;
    logLevel: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    marketDataSnapshot?: Record<string, any>;
}


export interface Portfolio {
  balance: number;
  equity: number;
  pnl: number;
  openPositions: Position[];
}

export interface Position {
  figi: string;
  instrument: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
}


export type AppView = 'DASHBOARD' | 'STRATEGY_EDITOR' | 'BACKTESTING' | 'SETTINGS' | 'DATA_MANAGER' | 'CHARTS' | 'TINKOFF_SERVICES';

export interface OhlcvBar {
  timestamp: number; // Unix timestamp (milliseconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface HistoricalDataset {
  id: string; // instrumentName-timeframe-source
  instrumentName: string;
  timeframe: Timeframe;
  source: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  barCount: number;
  addedAt: string; // ISO string
}

export interface ApiTokenInfo {
  name: string;
  secretPath: string;
  isActive: boolean;
}