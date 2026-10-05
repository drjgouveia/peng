import { Printer, Trash2, Copy, Bot } from 'lucide-react';

interface EditorToolbarProps {
    onPrint: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onLlmSuggest: () => void;
}

export default function EditorToolbar({ onPrint, onDelete, onDuplicate, onLlmSuggest }: EditorToolbarProps) {
    return (
        <div className="absolute top-6 right-8 flex items-center gap-3 print:hidden z-10">
            <button
                onClick={onLlmSuggest}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-md transition-colors border border-purple-500/30"
                title="AI Suggestions"
            >
                <Bot className="w-4 h-4 mr-2" /> AI Suggest
            </button>
            <button
                onClick={onDuplicate}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700 rounded-md transition-colors border border-zinc-700/50"
                title="Duplicate Finding"
            >
                <Copy className="w-4 h-4 mr-2" /> Duplicate
            </button>
            <button
                onClick={onPrint}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700 rounded-md transition-colors border border-zinc-700/50"
            >
                <Printer className="w-4 h-4 mr-2" /> Print / PDF
            </button>
            <button
                onClick={onDelete}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                title="Delete Finding"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
    );
}
