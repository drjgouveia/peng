import { useState } from 'react';
import { X, Bot, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { LlmConfig, LlmSuggestion } from '../../lib/llm';
import { generateSuggestions } from '../../lib/llm';
import type { Finding } from '../../types';

interface LlmSuggestModalProps {
    finding: Finding;
    config: LlmConfig;
    onClose: () => void;
    onApply: (field: 'description' | 'impact' | 'remediation', value: string) => void;
}

export default function LlmSuggestModal({ finding, config, onClose, onApply }: LlmSuggestModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<LlmSuggestion | null>(null);
    const [applied, setApplied] = useState<Set<string>>(new Set());

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setSuggestion(null);
        setApplied(new Set());
        try {
            const result = await generateSuggestions(
                config,
                finding.title,
                finding.poc,
                finding.requestResponses,
            );
            setSuggestion(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = (field: 'description' | 'impact' | 'remediation') => {
        if (!suggestion) return;
        onApply(field, suggestion[field]);
        setApplied((prev) => new Set(prev).add(field));
    };

    const handleApplyAll = () => {
        if (!suggestion) return;
        onApply('description', suggestion.description);
        onApply('impact', suggestion.impact);
        onApply('remediation', suggestion.remediation);
        setApplied(new Set(['description', 'impact', 'remediation']));
    };

    const fields: { key: 'description' | 'impact' | 'remediation'; label: string }[] = [
        { key: 'description', label: 'Description' },
        { key: 'impact', label: 'Impact' },
        { key: 'remediation', label: 'Remediation' },
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[80vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-purple-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-white">AI Suggestions</h2>
                            <p className="text-xs text-zinc-500">
                                Based on title, PoC, and request/response data
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!suggestion && !loading && !error && (
                        <div className="text-center py-12">
                            <Bot className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-500 text-sm">Click below to generate AI-powered suggestions for this finding</p>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
                            <p className="text-zinc-400 text-sm">Generating suggestions...</p>
                            <p className="text-zinc-600 text-xs mt-1">This may take a few seconds</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-400 font-medium">Generation Failed</p>
                                <p className="text-xs text-red-400/70 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {suggestion && (
                        <div className="space-y-4">
                            {fields.map(({ key, label }) => (
                                <div key={key} className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium text-zinc-200">{label}</h4>
                                        <button
                                            onClick={() => handleApply(key)}
                                            disabled={applied.has(key)}
                                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                                applied.has(key)
                                                    ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                            }`}
                                        >
                                            {applied.has(key) ? (
                                                <>
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Applied
                                                </>
                                            ) : (
                                                'Apply'
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">{suggestion[key]}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800 shrink-0">
                    {suggestion && applied.size < 3 && (
                        <button
                            onClick={handleApplyAll}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Apply All
                        </button>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Bot className="w-4 h-4" />
                        )}
                        {loading ? 'Generating...' : suggestion ? 'Regenerate' : 'Generate Suggestions'}
                    </button>
                </div>
            </div>
        </div>
    );
}
