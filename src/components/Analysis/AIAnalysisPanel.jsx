import React from 'react';
import { Brain } from 'lucide-react';

const AIAnalysisPanel = ({ analysisReport }) => {
    if (!analysisReport) return null;

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Brain className="text-indigo-600" />
                AI Performance Analysis
            </h2>
            <div className="prose max-w-none">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                    <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
                        {analysisReport}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default AIAnalysisPanel;
