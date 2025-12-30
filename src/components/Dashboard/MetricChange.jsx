import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

// Render metric change (DRY component)
const MetricChange = ({ changes, isCurrency = false }) => {
    if (changes.isNew) return <div className="text-sm text-blue-600">First Week</div>;
    if (changes.change === 0) return <div className="text-sm text-gray-500">No change</div>;

    const colorClass = changes.change > 0 ? 'text-green-600' : 'text-red-600';
    const Icon = changes.change > 0 ? TrendingUp : TrendingDown;
    const prefix = changes.change > 0 ? '+' : '';
    const value = isCurrency ? formatCurrency(Math.abs(changes.change)) : Math.abs(changes.change);

    return (
        <div className={`text-sm flex items-center justify-center gap-1 ${colorClass}`}>
            <Icon className="w-3 h-3" />
            <span className="text-xs">{prefix}{value} ({prefix}{changes.percentage}%)</span>
        </div>
    );
};

export default MetricChange;
