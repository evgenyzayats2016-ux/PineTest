import type { OhlcvBar, Timeframe } from '../types';

/**
 * Returns the expected interval in milliseconds for a given timeframe.
 */
const getTimeframeInterval = (timeframe: Timeframe): number => {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1), 10);
    if (isNaN(value)) return 0;

    switch (unit) {
        case 'M': return value * 60 * 1000; // Minutes
        case 'H': return value * 60 * 60 * 1000; // Hours
        case 'D': return value * 24 * 60 * 60 * 1000; // Days
        default: return 0;
    }
};

/**
 * Analyzes the raw OHLCV data to find duplicates and time gaps.
 */
export const analyzeData = (data: OhlcvBar[], timeframe: Timeframe) => {
    if (data.length < 2) {
        return { duplicateCount: 0, missingCount: 0 };
    }

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const interval = getTimeframeInterval(timeframe);
    let duplicateCount = 0;
    let missingCount = 0;
    const seenTimestamps = new Set<number>();
    let uniqueCount = 0;

    for (let i = 0; i < sortedData.length; i++) {
        const current = sortedData[i];

        // Check for duplicates
        if (seenTimestamps.has(current.timestamp)) {
            duplicateCount++;
        } else {
            uniqueCount++;
            if (uniqueCount > 1 && interval > 0) {
                 const prevTimestamp = Array.from(seenTimestamps).pop()!;
                 const timeDiff = current.timestamp - prevTimestamp;
                 if (timeDiff > interval * 1.5) { // Use 1.5 multiplier to avoid floating point issues
                    const gaps = Math.round(timeDiff / interval) - 1;
                    if (gaps > 0) missingCount += gaps;
                 }
            }
            seenTimestamps.add(current.timestamp);
        }
    }

    return { duplicateCount, missingCount };
};

/**
 * Removes duplicate bars based on timestamp, keeping the first one encountered.
 */
export const removeDuplicates = (data: OhlcvBar[]): OhlcvBar[] => {
    const seen = new Set<number>();
    return data.filter(bar => {
        if (seen.has(bar.timestamp)) {
            return false;
        }
        seen.add(bar.timestamp);
        return true;
    });
};

/**
 * Fills missing timestamp gaps in the data.
 */
export const fillGaps = (data: OhlcvBar[], timeframe: Timeframe, method: 'forward' | 'interpolate'): OhlcvBar[] => {
    if (data.length < 2) return data;

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const interval = getTimeframeInterval(timeframe);
    if (interval === 0) return sortedData;

    const result: OhlcvBar[] = [sortedData[0]];

    for (let i = 1; i < sortedData.length; i++) {
        const prev = result[result.length - 1];
        const current = sortedData[i];
        const timeDiff = current.timestamp - prev.timestamp;

        if (timeDiff > interval * 1.5) { // Use 1.5 to be safe with timing variations
            const gaps = Math.round(timeDiff / interval) - 1;

            for (let j = 1; j <= gaps; j++) {
                const newTimestamp = prev.timestamp + j * interval;
                let newBar: OhlcvBar;

                if (method === 'forward') {
                    newBar = { ...prev, timestamp: newTimestamp, volume: 0 }; // Set volume to 0 for filled bars
                } else { // interpolate
                    const ratio = j / (gaps + 1);
                    const interp = (key: keyof OhlcvBar) => {
                         if (typeof prev[key] !== 'number' || typeof current[key] !== 'number') {
                             return undefined;
                         }
                         return (prev[key] as number) + ((current[key] as number) - (prev[key] as number)) * ratio;
                    }
                   
                    newBar = {
                        timestamp: newTimestamp,
                        open: interp('open')!,
                        high: interp('high')!,
                        low: interp('low')!,
                        close: interp('close')!,
                        volume: current.volume !== undefined && prev.volume !== undefined ? 0 : undefined,
                    };
                }
                result.push(newBar);
            }
        }
        result.push(current);
    }
    return result;
};
