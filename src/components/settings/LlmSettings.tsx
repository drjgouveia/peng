import { useState } from 'react';
import { Bot, Server, Key, Cpu, Save, CheckCircle2 } from 'lucide-react';
import type { LlmConfig } from '../../lib/llm';

interface LlmSettingsProps {
    config: LlmConfig;
    onSave: (config: LlmConfig) => void;
}

export default function LlmSettings({ config, onSave }: LlmSettingsProps) {
    const [local, setLocal] = useState(config);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        onSave(local);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div>
            <h3 className="flex items-center text-lg font-semibold text-zinc-100 print:text-black mb-3">
                <Bot className="w-5 h-5 mr-2 text-purple-400/70 print:hidden" /> LLM Integration
            </h3>
            <p className="text-xs text-zinc-500 mb-4 print:hidden">
                Configure an LLM to auto-generate Description, Impact, and Remediation suggestions for findings.
            </p>

            <div className="space-y-4">
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                        <Server className="w-4 h-4" /> Provider
                    </label>
                    <select
                        value={local.provider}
                        onChange={(e) => setLocal({ ...local, provider: e.target.value as 'ollama' | 'openai' })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                    >
                        <option value="ollama" className="bg-zinc-900">Ollama (Local)</option>
                        <option value="openai" className="bg-zinc-900">OpenAI / Compatible API</option>
                    </select>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                        <Server className="w-4 h-4" /> Endpoint
                    </label>
                    <input
                        type="text"
                        value={local.endpoint}
                        onChange={(e) => setLocal({ ...local, endpoint: e.target.value })}
                        placeholder={local.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-600"
                    />
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                        <Cpu className="w-4 h-4" /> Model
                    </label>
                    <input
                        type="text"
                        value={local.model}
                        onChange={(e) => setLocal({ ...local, model: e.target.value })}
                        placeholder={local.provider === 'ollama' ? 'llama3.1' : 'gpt-4o'}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-600"
                    />
                </div>

                {local.provider === 'openai' && (
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                            <Key className="w-4 h-4" /> API Key
                        </label>
                        <input
                            type="password"
                            value={local.apiKey}
                            onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
                            placeholder="sk-..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-600"
                        />
                    </div>
                )}

                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                >
                    {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Saved!' : 'Save LLM Settings'}
                </button>
            </div>
        </div>
    );
}
