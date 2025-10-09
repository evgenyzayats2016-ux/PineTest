
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import Spinner from './shared/Spinner';
import type { Strategy, Indicator } from '../types';
import { useAuth } from '../hooks/useAuth';
import { fetchStrategyById, saveStrategy } from '../services/mockApi';

interface StrategyEditorProps {
    strategyId: string | null;
    onSave: () => void;
}

const highlightSyntax = (code: string): string => {
    if (!code) return '';
    const variableDeclarations = code.matchAll(/\b(?:const|let|var)\s+([a-zA-Z_]\w*)/g);
    const userVariables = [...variableDeclarations].map(match => match[1]);
    let highlighted = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    highlighted = highlighted.replace(/(\/\/.+)/g, '<span class="text-slate-500">$1</span>');
    highlighted = highlighted.replace(/"([^"\\]|\\.)*"/g, '<span class="text-emerald-400">$&</span>');
    highlighted = highlighted.replace(/\b(const|let|var|if|else|return|true|false|null)\b/g, '<span class="text-fuchsia-500">$1</span>');
    highlighted = highlighted.replace(/(\.)([a-zA-Z_]\w*)/g, '$1<span class="text-teal-300">$2</span>');
    highlighted = highlighted.replace(/\b-?\d+(\.\d+)?\b/g, '<span class="text-amber-400">$&</span>');
    if (userVariables.length > 0) {
        const userVarRegex = new RegExp(`\\b(${userVariables.join('|')})\\b`, 'g');
        highlighted = highlighted.replace(userVarRegex, '<span class="text-violet-400">$1</span>');
    }
    highlighted = highlighted.replace(/\b(close|open|high|low)\b/g, '<span class="text-orange-400">$1</span>');
    highlighted = highlighted.replace(/\b(strategy|ta|indicators|cross)\b/g, '<span class="text-sky-400">$&</span>');
    return highlighted;
};

const CodeEditor: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
    const highlightedCode = useMemo(() => highlightSyntax(value), [value]);
    const preRef = useRef<HTMLPreElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleScroll = () => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    return (
        <div className="relative w-full h-96 font-mono text-sm bg-brand-bg border border-brand-surface-light rounded-md">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                className="absolute top-0 left-0 w-full h-full p-4 bg-transparent text-transparent caret-brand-text border-0 resize-none outline-none z-10 whitespace-pre"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
            />
            <pre
                ref={preRef}
                aria-hidden="true"
                className="absolute top-0 left-0 w-full h-full p-4 overflow-auto pointer-events-none"
            >
                <code dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }} />
            </pre>
        </div>
    );
};

const EMPTY_STRATEGY_DRAFT = {
    name: '',
    description: '',
    instrumentFigi: 'FUTNG0000000', // Default FIGI for Natural Gas
    timeframe: '1H' as const,
    pineTsCode: `// Пример стратегии пересечения скользящих средних.\nconst shortMA = indicators.sma_short;\nconst longMA = indicators.sma_long;\n\nif (cross(shortMA, longMA)) {\n  strategy.entry("long");\n} else if (cross(longMA, shortMA)) {\n  strategy.close();\n}`,
    isActive: false,
    indicators: [
        { id: 'sma_short', type: 'SMA', parameters: { period: 10 } },
        { id: 'sma_long', type: 'SMA', parameters: { period: 30 } },
    ],
    stopLoss: { type: 'NONE' as const, value: 0 },
    takeProfit: { type: 'NONE' as const, value: 0 },
};

const StrategyEditor: React.FC<StrategyEditorProps> = ({ strategyId, onSave }) => {
    const { user } = useAuth();
    const [strategy, setStrategy] = useState<Partial<Strategy>>(EMPTY_STRATEGY_DRAFT);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        const loadStrategy = async () => {
            if (!user) return;
            setIsLoading(true);
            if (strategyId) {
                const fetchedStrategy = await fetchStrategyById(strategyId);
                if (fetchedStrategy) {
                    setStrategy(fetchedStrategy);
                } else {
                    console.error("Strategy not found or access denied!");
                    onSave(); // Redirect back if not found
                }
            } else {
                setStrategy(EMPTY_STRATEGY_DRAFT);
            }
            setIsLoading(false);
        };
        loadStrategy();
    }, [strategyId, user, onSave]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setStrategy(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!user) {
            setSaveError("Вы не авторизованы.");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            const dataToSave = {
                ...strategy,
                userId: user.uid,
            };

            await saveStrategy(dataToSave);
            onSave();
        } catch (error) {
            console.error("Failed to save strategy", error);
            setSaveError("Не удалось сохранить стратегию.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card title={strategyId ? 'Редактировать стратегию' : 'Создать новую стратегию'}>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-brand-text-secondary">Название</label>
                        <input type="text" name="name" value={strategy.name || ''} onChange={handleChange} className="mt-1 block w-full bg-brand-bg border border-brand-surface-light rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary">Код PineTS</label>
                        <CodeEditor value={strategy.pineTsCode || ''} onChange={(code) => setStrategy(p => ({...p, pineTsCode: code}))} />
                    </div>
                     {/* Other fields like description, FIGI, timeframe, indicators would go here */}
                </div>
            </Card>

            <div className="flex justify-end items-center space-x-4">
                {saveError && <p className="text-sm text-brand-danger mr-auto">{saveError}</p>}
                <Button variant="secondary" onClick={onSave}>Отмена</Button>
                <Button onClick={handleSave} isLoading={isSaving}>Сохранить</Button>
            </div>
        </div>
    );
};

export default StrategyEditor;
