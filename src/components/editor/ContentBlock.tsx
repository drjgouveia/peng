import type { LucideIcon } from 'lucide-react';
import { Wand2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface ContentBlockProps {
    icon: LucideIcon;
    iconClassName: string;
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    onLlmAdjust?: () => void;
}

export default function ContentBlock({
    icon: Icon,
    iconClassName,
    label,
    value,
    placeholder,
    onChange,
    onLlmAdjust,
}: ContentBlockProps) {
    return (
        <div className="group">
            <h3 className="flex items-center text-lg font-semibold text-zinc-100 print:text-black mb-3">
                <Icon className={`w-5 h-5 mr-2 print:hidden ${iconClassName}`} /> {label}
                {onLlmAdjust && (
                    <button
                        onClick={onLlmAdjust}
                        className="ml-2 print:hidden p-1.5 text-zinc-600 hover:text-purple-400 hover:bg-zinc-800 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title={`Adjust ${label} with AI`}
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </h3>
            <RichTextEditor
                content={value}
                placeholder={placeholder}
                onChange={onChange}
            />
        </div>
    );
}
