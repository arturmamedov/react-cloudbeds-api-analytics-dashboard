import React from 'react';
import { AlertTriangle } from 'lucide-react';

const WarningBanner = ({ warnings }) => {
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">Warnings</h3>
            </div>
            {warnings.map((warning, index) => (
                <p key={index} className="text-yellow-700 text-sm">{warning}</p>
            ))}
        </div>
    );
};

export default WarningBanner;
