import { useState } from 'react';
import { X, Bot, Loader2, AlertCircle, Wand2 } from 'lucide-react';
import type { LlmConfig } from '../../lib/llm';
import { adjustText } from '../../lib/llm';

interface LlmAdjustModalProps {
    fieldLabel: string;
    originalText: string;
    config: LlmConfig;
    onClose: () => void;
    onApply: (adjustedText: string) => void;
}

export default function LlmAdjustModal({ fieldLabel, originalText, config, onClose, onApply }: LlmAdjustModalProps) {
    const [instruction, setInstruction] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleAdjust = async () => {
        if (!instruction.trim()) return;
        setLoading(true);
        setError(null);
        setPreview(null);
        try {
            const result = await adjustText(config, originalText, instruction.trim());
            setPreview(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to adjust text');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[80vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <Wand2 className="w-5 h-5 text-purple-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-white">Adjust {fieldLabel}</h2>
                            <p className="text-xs text-zinc-500">Describe how you want to adjust the text</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-zinc-300 mb-2 block">Instruction</label>
                        <textarea
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="e.g., Compress the text to 2 sentences, Make it more technical, Translate to Portuguese..."
                            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 resize-none"
                            rows={3}
                        />
                    </div>

                    {loading && (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
                            <p className="text-zinc-400 text-sm">Adjusting text...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-400 font-medium">Adjustment Failed</p>
                                <p className="text-xs text-red-400/70 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {preview && (
                        <div>
                            <label className="text-sm font-medium text-zinc-300 mb-2 block">Preview</label>
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-sm text-zinc-300 whitespace-pre-wrap">
                                {preview}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800 shrink-0">
                    {preview && (
                        <button
                            onClick={() => onApply(preview)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                        >
                            <Bot className="w-4 h-4" />
                            Apply
                        </button>
                    )}
                    <button
                        onClick={handleAdjust}
                        disabled={loading || !instruction.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Wand2 className="w-4 h-4" />
                        )}
                        {loading ? 'Adjusting...' : preview ? 'Re-adjust' : 'Adjust'}
                    </button>
                </div>
            </div>
        </div>
    );
}
