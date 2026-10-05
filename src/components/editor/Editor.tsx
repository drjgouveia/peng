import { useState, useEffect } from 'react';
import { FileText, Layout, Bug, CheckCircle2, FlaskConical, ArrowRightLeft, BookOpen, StickyNote, Plus, X } from 'lucide-react';
import EditorToolbar from './EditorToolbar';
import FindingTitle from './FindingTitle';
import ContentBlock from './ContentBlock';
import LlmSuggestModal from './LlmSuggestModal';
import { FindingDetail } from '../../templates/default/FindingDetail';
import type { Finding, Severity, RequestResponseEntry, Endpoint } from '../../types';
import type { LlmConfig } from '../../lib/llm';
import CvssCalculatorModal from './CvssCalculatorModal';

const OPTIONAL_SECTIONS = [
    { key: 'poc' as const, label: 'Proof of Concept', icon: FlaskConical, iconClass: 'text-purple-400/70', placeholder: 'Step-by-step instructions to reproduce the vulnerability...' },
    { key: 'businessSummary' as const, label: 'Business Summary', icon: FileText, iconClass: 'text-indigo-400/70', placeholder: 'Business impact and context...' },
    { key: 'references' as const, label: 'References', icon: BookOpen, iconClass: 'text-amber-400/70', placeholder: 'OWASP links, vendor advisories, CWE references, related articles...' },
    { key: 'notes' as const, label: 'Notes', icon: StickyNote, iconClass: 'text-zinc-400/70', placeholder: 'Internal notes (not included in final report)...' },
];

type SectionKey = typeof OPTIONAL_SECTIONS[number]['key'] | 'requestResponse';

interface EditorProps {
    selectedFinding: Finding | null;
    onUpdateField: (field: keyof Finding, value: string | Endpoint[] | RequestResponseEntry[]) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    llmConfig: LlmConfig | null;
}

export default function Editor({ selectedFinding, onUpdateField, onDelete, onDuplicate, llmConfig }: EditorProps) {
    const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(new Set());
    const [cvssModalOpen, setCvssModalOpen] = useState(false);
    const [llmModalOpen, setLlmModalOpen] = useState(false);

    useEffect(() => {
        if (!selectedFinding) return;
        const next = new Set<SectionKey>();
        for (const s of OPTIONAL_SECTIONS) {
            if (selectedFinding[s.key]) next.add(s.key);
        }
        if (selectedFinding.requestResponses.length > 0) next.add('requestResponse');
        setVisibleSections(next);
    }, [selectedFinding?.id]);

    const hiddenSections = OPTIONAL_SECTIONS.filter((s) => !visibleSections.has(s.key));

    const addSection = (key: SectionKey) => {
        if (key === 'requestResponse') {
            setVisibleSections((prev) => new Set(prev).add(key));
            if (selectedFinding && selectedFinding.requestResponses.length === 0) {
                onUpdateField('requestResponses', [{ id: crypto.randomUUID(), request: '', response: '' }]);
            }
        } else {
            setVisibleSections((prev) => new Set(prev).add(key));
        }
    };

    const removeSection = (key: SectionKey) => {
        if (key === 'requestResponse') {
            onUpdateField('requestResponses', []);
        } else {
            onUpdateField(key, '');
        }
        setVisibleSections((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };

    const addRequestResponse = () => {
        const next = [...selectedFinding!.requestResponses, { id: crypto.randomUUID(), request: '', response: '' }];
        onUpdateField('requestResponses', next);
    };

    const removeRequestResponse = (index: number) => {
        const next = selectedFinding!.requestResponses.filter((_, i) => i !== index);
        onUpdateField('requestResponses', next);
    };

    const updateRequestResponse = (index: number, field: 'request' | 'response', value: string) => {
        const next = selectedFinding!.requestResponses.map((rr, i) =>
            i === index ? { ...rr, [field]: value } : rr
        );
        onUpdateField('requestResponses', next);
    };

    return (
        <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
            {/* Editor UI — hidden in print */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:hidden">
                {selectedFinding && (
                    <EditorToolbar
                        onPrint={() => window.print()}
                        onDelete={() => onDelete(selectedFinding.id)}
                        onDuplicate={() => onDuplicate(selectedFinding.id)}
                        onLlmSuggest={() => setLlmModalOpen(true)}
                    />
                )}

                <div className="flex-1 overflow-y-auto print:overflow-visible">
                    {selectedFinding ? (
                        <div className="max-w-4xl mx-auto px-12 py-16 print:p-0 print:max-w-none">
                            <FindingTitle
                                finding={selectedFinding}
                                onUpdate={onUpdateField}
                                onOpenCvssCalculator={() => setCvssModalOpen(true)}
                            />

                            <div className="space-y-8 print:space-y-8">
                                {/* Description — always visible */}
                                <ContentBlock
                                    icon={Layout}
                                    iconClassName="text-zinc-500"
                                    label="Description"
                                    value={selectedFinding.description}
                                    placeholder="Detailed technical description of the vulnerability..."
                                    onChange={(value) => onUpdateField('description', value)}
                                />

                                {/* Impact — always visible */}
                                <ContentBlock
                                    icon={Bug}
                                    iconClassName="text-red-400/70"
                                    label="Impact"
                                    value={selectedFinding.impact}
                                    placeholder="What are the consequences if this vulnerability is successfully exploited?"
                                    onChange={(value) => onUpdateField('impact', value)}
                                />

                                {/* Remediation — always visible */}
                                <ContentBlock
                                    icon={CheckCircle2}
                                    iconClassName="text-emerald-400/70"
                                    label="Remediation"
                                    value={selectedFinding.remediation}
                                    placeholder="Recommendations for software developers / system administrators to fix the vulnerability..."
                                    onChange={(value) => onUpdateField('remediation', value)}
                                />

                                {/* Optional sections — PoC, References, Notes */}
                                {OPTIONAL_SECTIONS.filter((s) => visibleSections.has(s.key)).map((section) => (
                                    <div key={section.key} className="group/section relative">
                                        <button
                                            onClick={() => removeSection(section.key)}
                                            className="absolute -top-2 right-0 text-xs text-zinc-600 hover:text-red-400 opacity-0 group-hover/section:opacity-100 transition-opacity print:hidden"
                                            title={`Remove ${section.label}`}
                                        >
                                            Remove
                                        </button>
                                        <ContentBlock
                                            icon={section.icon}
                                            iconClassName={section.iconClass}
                                            label={section.label}
                                            value={selectedFinding[section.key]}
                                            placeholder={section.placeholder}
                                            onChange={(value) => onUpdateField(section.key, value)}
                                        />
                                    </div>
                                ))}

                                {/* Request / Response — multiple entries */}
                                {visibleSections.has('requestResponse') && (
                                    <div className="relative group/section">
                                        <button
                                            onClick={() => removeSection('requestResponse')}
                                            className="absolute -top-2 right-0 text-xs text-zinc-600 hover:text-red-400 opacity-0 group-hover/section:opacity-100 transition-opacity print:hidden"
                                            title="Remove Request / Response"
                                        >
                                            Remove
                                        </button>
                                        <h3 className="flex items-center text-lg font-semibold text-zinc-100 print:text-black mb-3">
                                            <ArrowRightLeft className="w-5 h-5 mr-2 text-cyan-400/70 print:hidden" /> Request / Response
                                        </h3>
                                        <div className="space-y-4">
                                            {selectedFinding.requestResponses.map((rr, index) => (
                                                <div key={rr.id} className="flex gap-4 items-start">
                                                    <div className="flex-1">
                                                        <label className="text-xs text-zinc-500 mb-1 block">Request</label>
                                                        <textarea
                                                            value={rr.request}
                                                            onChange={(e) => updateRequestResponse(index, 'request', e.target.value)}
                                                            placeholder="HTTP request..."
                                                            className="w-full bg-transparent text-xs text-zinc-300 placeholder-zinc-600 outline-none px-2 py-1.5 rounded hover:bg-zinc-700/30 focus:bg-zinc-700/30 transition-colors border border-zinc-800 min-h-[72px]"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-xs text-zinc-500 mb-1 block">Response</label>
                                                        <textarea
                                                            value={rr.response}
                                                            onChange={(e) => updateRequestResponse(index, 'response', e.target.value)}
                                                            placeholder="HTTP response..."
                                                            className="w-full bg-transparent text-xs text-zinc-300 placeholder-zinc-600 outline-none px-2 py-1.5 rounded hover:bg-zinc-700/30 focus:bg-zinc-700/30 transition-colors border border-zinc-800 min-h-[72px]"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeRequestResponse(index)}
                                                        className="mt-6 p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover/section:opacity-100 transition-opacity"
                                                        title="Remove"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={addRequestResponse} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 px-3 py-2 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors mt-2">
                                            <Plus className="w-3.5 h-3.5" /> Add request/response
                                        </button>
                                    </div>
                                )}

                                {/* + Add section buttons */}
                                {(hiddenSections.length > 0 || !visibleSections.has('requestResponse')) && (
                                    <div className="flex items-center gap-2 print:hidden">
                                        {hiddenSections.map((section) => {
                                            const Icon = section.icon;
                                            return (
                                                <button
                                                    key={section.key}
                                                    onClick={() => addSection(section.key)}
                                                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 px-3 py-2 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {section.label}
                                                </button>
                                            );
                                        })}
                                        {!visibleSections.has('requestResponse') && (
                                            <button
                                                onClick={() => addSection('requestResponse')}
                                                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 px-3 py-2 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                                Request / Response
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 print:hidden">
                            <div className="w-16 h-16 mb-6 rounded-2xl bg-zinc-800/50 flex items-center justify-center border border-zinc-800">
                                <FileText className="w-8 h-8 text-zinc-400" />
                            </div>
                            <h2 className="text-xl font-medium text-zinc-300 mb-2">Workspace</h2>
                            <p className="text-sm">
                                Select a finding from the left menu or start creating a new report.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Print-only: render finding in report style */}
            {selectedFinding && (
                <div className="hidden print:block print:bg-white print:text-black">
                    <FindingDetail finding={selectedFinding} index={0} />
                </div>
            )}

            {selectedFinding && (
                <CvssCalculatorModal
                    open={cvssModalOpen}
                    onClose={() => setCvssModalOpen(false)}
                    initialVector={selectedFinding.cvssVector ?? ''}
                    onApply={({ score, severity, vector, applySeverity }) => {
                        onUpdateField('cvss', score);
                        onUpdateField('cvssVector', vector);
                        if (applySeverity) {
                            onUpdateField('severity', severity as Severity);
                        }
                    }}
                />
            )}

            {selectedFinding && llmConfig && llmModalOpen && (
                <LlmSuggestModal
                    finding={selectedFinding}
                    config={llmConfig}
                    onClose={() => setLlmModalOpen(false)}
                    onApply={(field, value) => onUpdateField(field, value)}
                />
            )}
        </main>
    );
}
