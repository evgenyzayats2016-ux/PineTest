import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import Card from './shared/Card';
import Button from './shared/Button';
import Spinner from './shared/Spinner';
import Modal from './shared/Modal';
import DatasetViewer from './DatasetViewer';
import type { HistoricalDataset, OhlcvBar, Timeframe } from '../types';
import { getDatasets, saveDataset, deleteDataset } from '../services/dataStore';
import { analyzeData, removeDuplicates, fillGaps } from '../services/dataProcessing';


type ImportStep = 'SELECT_FILE' | 'CONFIGURE' | 'PREPROCESS' | 'SAVING';

const DataManager: React.FC = () => {
    const [datasets, setDatasets] = useState<HistoricalDataset[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LIBRARY' | 'IMPORTER'>('LIBRARY');
    const [viewingDataset, setViewingDataset] = useState<HistoricalDataset | null>(null);

    const loadDatasets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDatasets();
            setDatasets(data.sort((a,b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()));
        } catch (error) {
            console.error("Failed to load datasets:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDatasets();
    }, [loadDatasets]);

    const handleDeleteDataset = async (datasetId: string) => {
        if (window.confirm("Вы уверены, что хотите удалить этот датасет? Это действие необратимо.")) {
            try {
                await deleteDataset(datasetId);
                await loadDatasets();
            } catch (error) {
                console.error("Failed to delete dataset:", error);
            }
        }
    };

    if (loading) {
        return <Spinner />;
    }

    return (
        <div className="space-y-6">
            <Card title="Библиотека данных" action={
                <Button onClick={() => setView(view === 'LIBRARY' ? 'IMPORTER' : 'LIBRARY')}>
                    {view === 'LIBRARY' ? 'Импортировать новый датасет' : 'К библиотеке'}
                </Button>
            }>
                {view === 'IMPORTER' ? (
                    <DataImporter onImportSuccess={() => {
                        setView('LIBRARY');
                        loadDatasets();
                    }} />
                ) : (
                    <div className="space-y-3">
                         {datasets.length > 0 ? datasets.map(d => (
                            <div key={d.id} className="flex items-center justify-between p-3 bg-brand-surface-light rounded-md">
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 w-full text-sm">
                                    <p><span className="font-semibold text-brand-text">{d.instrumentName}</span></p>
                                    <p className="text-brand-text-secondary">Таймфрейм: <span className="font-mono text-brand-text">{d.timeframe}</span></p>
                                    <p className="text-brand-text-secondary">Период: <span className="font-mono text-brand-text">{new Date(d.startDate).toLocaleDateString()} - {new Date(d.endDate).toLocaleDateString()}</span></p>
                                    <p className="text-brand-text-secondary">Баров: <span className="font-mono text-brand-text">{d.barCount}</span></p>
                                     <p className="text-brand-text-secondary">Источник: <span className="font-mono text-brand-text">{d.source || 'N/A'}</span></p>
                                </div>
                                <div className="pl-4 flex space-x-2 shrink-0">
                                    <button onClick={() => setViewingDataset(d)} className="text-brand-accent hover:text-brand-accent-dark transition-colors p-1" aria-label="Просмотр датасета">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleDeleteDataset(d.id)} className="text-brand-danger hover:text-red-500 transition-colors p-1" aria-label="Удалить датасет">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-brand-text-secondary py-8">Ваша библиотека пуста. Начните с импорта нового датасета.</p>
                        )}
                    </div>
                )}
            </Card>

            {viewingDataset && (
                <Modal title={`Просмотр: ${viewingDataset.instrumentName} (${viewingDataset.timeframe})`} onClose={() => setViewingDataset(null)}>
                    <DatasetViewer dataset={viewingDataset} />
                </Modal>
            )}
        </div>
    );
};

// --- Importer Component ---

interface DataImporterProps {
    onImportSuccess: () => void;
}

interface DataStats {
  rowCount: number;
  duplicateCount: number;
  missingCount: number;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Parses custom YYYYMMDD and HHMMSS date/time formats into a Unix timestamp.
 * Uses UTC to avoid timezone issues during parsing.
 * @param dateStr Date string in YYYYMMDD format.
 * @param timeStr Time string in HHMMSS format (can be shorter, e.g., HMMSS).
 * @returns Unix timestamp in milliseconds.
 * @throws Error if formats are invalid.
 */
const parseCustomDateTime = (dateStr: string, timeStr?: string): number => {
    if (!/^\d{8}$/.test(dateStr)) {
        throw new Error(`Неверный формат даты: ожидался YYYYMMDD, получено '${dateStr}'`);
    }

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const isoDate = `${year}-${month}-${day}`;
    
    let isoTime = '00:00:00';
    if (timeStr && timeStr.trim() !== '') {
        const paddedTime = timeStr.trim().padStart(6, '0');
        const h = paddedTime.substring(0, 2);
        const m = paddedTime.substring(2, 4);
        const s = paddedTime.substring(4, 6);
        isoTime = `${h}:${m}:${s}`;
    }

    // Using 'Z' to specify UTC and avoid local timezone offsets during parsing
    const timestamp = new Date(`${isoDate}T${isoTime}Z`).getTime(); 

    if (isNaN(timestamp)) {
        throw new Error(`Не удалось распознать дату/время из '${dateStr}' и '${timeStr}'`);
    }
    return timestamp;
};


const DataImporter: React.FC<DataImporterProps> = ({ onImportSuccess }) => {
    const [step, setStep] = useState<ImportStep>('SELECT_FILE');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]); // For preview
    const [fullParsedData, setFullParsedData] = useState<OhlcvBar[]>([]); // For processing
    const [error, setError] = useState<string | null>(null);

    const [instrumentName, setInstrumentName] = useState('');
    const [timeframe, setTimeframe] = useState<Timeframe>('1H');
    const [source, setSource] = useState('');
    
    const [delimiter, setDelimiter] = useState<',' | ';' | '\t' | ''>('');
    const [hasHeader, setHasHeader] = useState(true);
    const [columnMap, setColumnMap] = useState({ date: '0', time: '1', open: '2', high: '3', low: '4', close: '5', volume: '6' });
    const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] }>({ isValid: false, errors: [] });

    // New state for preprocessing
    const [dataStats, setDataStats] = useState<DataStats | null>(null);
    const [preprocessOptions, setPreprocessOptions] = useState({
      removeDuplicates: true,
      fillMissing: 'none' as 'none' | 'forward' | 'interpolate',
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setInstrumentName(selectedFile.name.split('.')[0] || '');
            setDelimiter(''); // Reset to auto-detect

            Papa.parse(selectedFile, {
                preview: 5,
                skipEmptyLines: true,
                complete: (results) => {
                    const meta = results.meta;
                    if (meta.delimiter) {
                        setDelimiter(meta.delimiter as any);
                    }

                    const firstRow = results.data[0] as string[];
                    if (!firstRow) return;

                    const hasHeaderRow = firstRow.some(cell => isNaN(parseFloat(cell)) && /[a-zA-Z]/.test(cell));
                    setHasHeader(hasHeaderRow);

                    const headers = hasHeaderRow ? firstRow.map(h => h.toUpperCase().replace(/[<>]/g, '')) : [];

                    if (hasHeaderRow) {
                        const newColumnMap = { ...columnMap };
                        const headerIndexMap: { [key: string]: number } = {};
                        headers.forEach((h, i) => headerIndexMap[h] = i);

                        const mappings: { field: keyof typeof columnMap; keys: string[] }[] = [
                            { field: 'date', keys: ['DATE'] },
                            { field: 'time', keys: ['TIME'] },
                            { field: 'open', keys: ['OPEN'] },
                            { field: 'high', keys: ['HIGH'] },
                            { field: 'low', keys: ['LOW'] },
                            { field: 'close', keys: ['CLOSE'] },
                            { field: 'volume', keys: ['VOL', 'VOLUME'] }
                        ];

                        mappings.forEach(({ field, keys }) => {
                            for (const key of keys) {
                                if (headerIndexMap[key] !== undefined) {
                                    newColumnMap[field] = String(headerIndexMap[key]);
                                    break;
                                }
                            }
                        });
                        setColumnMap(newColumnMap);

                        const tickerIndex = headers.indexOf('TICKER');
                        const perIndex = headers.indexOf('PER');
                        const dataRow = results.data[1] as string[];

                        if (dataRow) {
                            if (tickerIndex !== -1 && dataRow[tickerIndex]) {
                                setInstrumentName(dataRow[tickerIndex]);
                            }
                            if (perIndex !== -1 && dataRow[perIndex]) {
                                const detectedTimeframe = `${dataRow[perIndex]}M`;
                                const validTimeframes: readonly string[] = ['1M', '5M', '15M', '1H', '4H', '1D'];
                                if (validTimeframes.includes(detectedTimeframe)) {
                                    setTimeframe(detectedTimeframe as Timeframe);
                                }
                            }
                        }
                    }
                }
            });
            setStep('CONFIGURE');
        }
    };
    
    // For preview in CONFIGURE step
    useEffect(() => {
        if (!file || step !== 'CONFIGURE') {
            setParsedData([]);
            return;
        }

        let isMounted = true;
        Papa.parse(file, {
            delimiter: delimiter || undefined, // Use undefined for auto-detect if delimiter is ''
            header: false,
            preview: 20,
            skipEmptyLines: true,
            complete: (results) => {
                if (isMounted) {
                    const data = hasHeader ? (results.data as any[]).slice(1) : results.data;
                    setParsedData(data as any[]);
                    setError(null);
                }
            },
            error: (err: any) => {
                if (isMounted) {
                    const message = err.message || 'An unknown parsing error occurred.';
                    setError(`Ошибка парсинга: ${message}`);
                    setParsedData([]);
                }
            },
        });

        return () => { isMounted = false; };
    }, [file, step, delimiter, hasHeader]);

    // Real-time validation for preview data
    useEffect(() => {
        if (parsedData.length === 0) {
            setValidationResult({ isValid: true, errors: [] });
            return;
        }

        const errors: string[] = [];
        const columnIndices = Object.values(columnMap).map(v => parseInt(v, 10));
        const maxIndex = Math.max(...columnIndices.filter(v => !isNaN(v)));

        parsedData.forEach((row, index) => {
            const rowIndex = (hasHeader ? index + 2 : index + 1);
            if (errors.length >= 5) return; // Stop after finding 5 errors

            if (row.length <= maxIndex) {
                 errors.push(`Строка ${rowIndex}: Недостаточно колонок для сопоставления.`);
                 return;
            }

            try {
                const dateStr = row[parseInt(columnMap.date, 10)];
                const timeStr = columnMap.time ? row[parseInt(columnMap.time, 10)] : undefined;
                parseCustomDateTime(dateStr, timeStr);
            } catch (e: any) {
                errors.push(`Строка ${rowIndex}: ${e.message}`);
            }
        });

        setValidationResult({ isValid: errors.length === 0, errors });

    }, [parsedData, columnMap, hasHeader]);
    
    const parseRowToOhlcv = (row: any[], index: number): OhlcvBar => {
        const dateStr = row[parseInt(columnMap.date, 10)];
        const timeStr = columnMap.time ? row[parseInt(columnMap.time, 10)] : undefined;
        
        const timestamp = parseCustomDateTime(dateStr, timeStr);

        const open = parseFloat(row[parseInt(columnMap.open, 10)]);
        const high = parseFloat(row[parseInt(columnMap.high, 10)]);
        const low = parseFloat(row[parseInt(columnMap.low, 10)]);
        const close = parseFloat(row[parseInt(columnMap.close, 10)]);
        const volumeStr = columnMap.volume ? row[parseInt(columnMap.volume, 10)] : undefined;
        const volume = volumeStr !== undefined ? parseFloat(volumeStr) : undefined;

        if ([open, high, low, close].some(isNaN)) {
             throw new Error(`Нечисловое значение OHLC в строке ${index + (hasHeader ? 2 : 1)}.`);
        }
        if (low > high) {
             throw new Error(`Low (${low}) выше High (${high}) в строке ${index + (hasHeader ? 2 : 1)}.`);
        }

        return { timestamp, open, high, low, close, volume: isNaN(volume!) ? undefined : volume };
    };

    const handleProceedToPreprocess = () => {
        if (!file) return;

        // This is a full parse, separate from the preview parse
        Papa.parse(file, {
            delimiter: delimiter || undefined,
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const ohlcvData: OhlcvBar[] = [];
                    const dataToParse = hasHeader ? (results.data as any[]).slice(1) : results.data;

                    for(let i = 0; i < dataToParse.length; i++) {
                        const row = dataToParse[i];
                        if (row.length > 1 || (row.length === 1 && row[0] !== '')) { // Check for non-empty rows
                            ohlcvData.push(parseRowToOhlcv(row, i));
                        }
                    }
                    
                    ohlcvData.sort((a,b) => a.timestamp - b.timestamp); // Sort by time ascending

                    // Analyze the parsed data
                    const stats = {
                        rowCount: ohlcvData.length,
                        ...analyzeData(ohlcvData, timeframe),
                        startDate: ohlcvData.length > 0 ? new Date(ohlcvData[0].timestamp).toISOString() : null,
                        endDate: ohlcvData.length > 0 ? new Date(ohlcvData[ohlcvData.length - 1].timestamp).toISOString() : null,
                    };

                    setFullParsedData(ohlcvData);
                    setDataStats(stats);
                    setStep('PREPROCESS');
                } catch (err: unknown) {
                    let message = 'Произошла неизвестная ошибка.';
                    if (err instanceof Error) {
                        message = err.message;
                    } else if (typeof err === 'string') {
                        message = err;
                    } else if (err && typeof err === 'object' && 'message' in err) {
                        // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'. Type guard `in` operator correctly narrows type, so `err.message` can be safely converted to a string.
                        message = String(err.message);
                    }
                    setError(`Критическая ошибка парсинга: ${message}. Проверьте сопоставление колонок и формат данных.`);
                    setStep('CONFIGURE'); // Revert to config on critical error
                }
            },
            error: (err: any) => { // Comes from PapaParse, has `message` property
                 setError(`Ошибка парсинга файла: ${err.message}`);
                 setStep('CONFIGURE');
            }
        });
    };

    const handleSave = async () => {
        if (!fullParsedData || !dataStats) return;

        setStep('SAVING');
        setError(null);

        try {
            let finalData = fullParsedData;
            if (preprocessOptions.removeDuplicates) {
                finalData = removeDuplicates(finalData);
            }
            if (preprocessOptions.fillMissing !== 'none') {
                finalData = fillGaps(finalData, timeframe, preprocessOptions.fillMissing);
            }
            
            finalData.sort((a,b) => a.timestamp - b.timestamp);

            const newDataset: HistoricalDataset = {
                id: `${instrumentName}-${timeframe}-${source || 'local'}-${Date.now()}`,
                instrumentName,
                timeframe,
                source: source || 'local_file',
                startDate: finalData.length > 0 ? new Date(finalData[0].timestamp).toISOString() : new Date().toISOString(),
                endDate: finalData.length > 0 ? new Date(finalData[finalData.length - 1].timestamp).toISOString() : new Date().toISOString(),
                barCount: finalData.length,
                addedAt: new Date().toISOString(),
            };
            
            await saveDataset(newDataset, finalData);
            onImportSuccess();

        } catch (err: unknown) {
            let message = 'Произошла неизвестная ошибка.';
            if (err instanceof Error) {
                message = err.message;
            } else if (typeof err === 'string') {
                message = err;
            }
            setError(`Ошибка сохранения: ${message}`);
            setStep('PREPROCESS'); // Revert to let user try again
        }
    };

    const ColumnMapper = () => {
        const headers = hasHeader && parsedData.length > 0 ? parsedData[0] : null;
        const totalColumns = parsedData.length > 0 ? parsedData[0].length : 10;
        const options = Array.from({ length: totalColumns }, (_, i) => <option key={i} value={i}>{headers && headers[i] ? `${i}: ${headers[i]}` : `Колонка ${i + 1}`}</option>);
        
        const fields: (keyof typeof columnMap)[] = ['date', 'time', 'open', 'high', 'low', 'close', 'volume'];

        return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {fields.map(field => (
                     <div key={field}>
                        <label className="block text-xs font-medium text-brand-text-secondary capitalize">{field}</label>
                        <select
                            value={columnMap[field] || ''}
                            onChange={(e) => setColumnMap(prev => ({ ...prev, [field]: e.target.value }))}
                            className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                        >
                           {field === 'time' || field === 'volume' ? <option value="">(Не используется)</option> : null}
                           {options}
                        </select>
                    </div>
                ))}
            </div>
        );
    };

    switch (step) {
        case 'SELECT_FILE':
            return (
                 <div className="text-center p-8 border-2 border-dashed border-brand-surface-light rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Загрузите файл с данными</h3>
                    <p className="text-sm text-brand-text-secondary mb-4">Поддерживаются форматы CSV и TXT.</p>
                    <input type="file" id="file-upload" accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
                    <Button onClick={() => document.getElementById('file-upload')?.click()}>Выбрать файл</Button>
                </div>
            );
        case 'CONFIGURE':
            return (
                 <div className="space-y-6">
                    <div>
                         <h3 className="text-lg font-semibold mb-3">1. Основная информация</h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-brand-text-secondary">Название инструмента</label>
                                <input type="text" value={instrumentName} onChange={e => setInstrumentName(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-text-secondary">Таймфрейм</label>
                                <select value={timeframe} onChange={e => setTimeframe(e.target.value as Timeframe)} className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent">
                                    <option>1M</option><option>5M</option><option>15M</option><option>1H</option><option>4H</option><option>1D</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-brand-text-secondary">Источник (опционально)</label>
                                <input type="text" value={source} onChange={e => setSource(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent" />
                            </div>
                         </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-3">2. Настройки парсинга</h3>
                        <div className="flex items-center space-x-6">
                             <div>
                                <label className="block text-sm font-medium text-brand-text-secondary">Разделитель</label>
                                <select value={delimiter} onChange={e => setDelimiter(e.target.value as any)} className="mt-1 block bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent">
                                    <option value="">Автоопределение</option>
                                    <option value=",">Запятая (,)</option>
                                    <option value=";">Точка с запятой (;)</option>
                                    <option value="\t">Табуляция (Tab)</option>
                                </select>
                            </div>
                             <div className="pt-6">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} className="form-checkbox h-4 w-4 text-brand-accent bg-brand-surface-light border-brand-surface-light rounded focus:ring-brand-accent" />
                                    <span className="ml-2 text-sm">Первая строка - заголовок</span>
                                </label>
                            </div>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-3">3. Сопоставление колонок</h3>
                        <ColumnMapper />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-3">4. Предпросмотр (первые 20 строк)</h3>
                         {error ? <p className="text-brand-danger">{error}</p> : (
                             <div className="overflow-x-auto max-h-60 border border-brand-surface-light rounded-md">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {parsedData.map((row, i) => (
                                            <tr key={i} className="border-b border-brand-surface-light last:border-b-0">
                                                {row.map((cell: string, j: number) => <td key={j} className="py-1 px-2 whitespace-nowrap">{cell}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         )}
                         {!validationResult.isValid && (
                             <div className="mt-3 p-3 bg-red-500/20 text-red-300 text-sm rounded-md">
                                <p className="font-semibold mb-1">Ошибки валидации:</p>
                                <ul className="list-disc list-inside">
                                    {validationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                         )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleProceedToPreprocess} disabled={!validationResult.isValid || !instrumentName}>
                            Далее
                        </Button>
                    </div>
                </div>
            );
        case 'PREPROCESS':
             if (!dataStats) return <Spinner />;
             return (
                <div className="space-y-6">
                     <div>
                        <h3 className="text-lg font-semibold mb-3">Анализ данных</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-brand-surface-light rounded-lg text-center">
                            <div><p className="text-sm text-brand-text-secondary">Всего строк</p><p className="text-2xl font-semibold">{dataStats.rowCount}</p></div>
                            <div><p className="text-sm text-brand-text-secondary">Дубликатов</p><p className="text-2xl font-semibold">{dataStats.duplicateCount}</p></div>
                            <div><p className="text-sm text-brand-text-secondary">Пропусков</p><p className="text-2xl font-semibold">{dataStats.missingCount}</p></div>
                             <div><p className="text-sm text-brand-text-secondary">Период</p><p className="text-base font-semibold">{new Date(dataStats.startDate!).toLocaleDateString()} - {new Date(dataStats.endDate!).toLocaleDateString()}</p></div>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-3">Опции предобработки</h3>
                        <div className="space-y-4 p-4 border border-brand-surface-light rounded-lg">
                            <label className="flex items-center">
                                <input type="checkbox" checked={preprocessOptions.removeDuplicates} onChange={e => setPreprocessOptions(p => ({ ...p, removeDuplicates: e.target.checked }))} className="form-checkbox h-4 w-4 text-brand-accent bg-brand-surface-light border-brand-surface-light rounded focus:ring-brand-accent" />
                                <span className="ml-2 text-sm">Удалить дубликаты ({dataStats.duplicateCount} строк)</span>
                            </label>
                             <div>
                                <label className="block text-sm font-medium text-brand-text-secondary">Заполнить пропуски в таймфрейме ({dataStats.missingCount} баров)</label>
                                <select 
                                    value={preprocessOptions.fillMissing} 
                                    onChange={e => setPreprocessOptions(p => ({ ...p, fillMissing: e.target.value as any }))} 
                                    className="mt-1 block w-full max-w-xs bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                                >
                                    <option value="none">Не заполнять</option>
                                    <option value="forward">Заполнить предыдущим значением (Forward Fill)</option>
                                    <option value="interpolate">Линейная интерполяция</option>
                                </select>
                            </div>
                        </div>
                    </div>
                     {error && <p className="text-brand-danger">{error}</p>}
                    <div className="flex justify-between items-center pt-4">
                        <Button variant="secondary" onClick={() => setStep('CONFIGURE')}>Назад</Button>
                        <Button onClick={handleSave}>Сохранить датасет</Button>
                    </div>
                </div>
             );
        case 'SAVING':
            return (
                <div className="text-center p-12">
                    <Spinner />
                    <p className="mt-4 text-brand-text-secondary">Сохранение данных...</p>
                </div>
            );
        default: return null;
    }
};

export default DataManager;