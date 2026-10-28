import { useState } from 'react';
import { Settings, FileText, Users, Calendar, Shield, Bookmark, Bot, Loader2, Wrench, Boxes, Flag, Target } from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';
import ScopeList from './ScopeList';
import LlmSettings from './LlmSettings';
import type { Project, Finding, ProjectTargetType } from '../../types';
import { parseScopeItems, stringifyScopeItems } from '../../types';
import type { LlmConfig } from '../../lib/llm';
import { generateExecutiveSummary } from '../../lib/llm';

interface ProjectSettingsProps {
    project: Project;
    findings: Finding[];
    onUpdate: (field: keyof Project, value: string) => void;
    llmConfig: LlmConfig;
    onUpdateLlmConfig: (config: LlmConfig) => void;
}

export default function ProjectSettings({ project, findings, onUpdate, llmConfig, onUpdateLlmConfig }: ProjectSettingsProps) {
    const [generatingSummary, setGeneratingSummary] = useState(false);

    // Multi-target projects: one editor per in-scope target
    const multi = project.targetType === 'multi-target';
    const targets = multi ? parseScopeItems(project.scope).filter((t) => t.included) : [];

    const updateTargetField = (targetId: string, field: 'executiveSummary' | 'conclusion' | 'testType', value: string) => {
        const items = parseScopeItems(project.scope).map((t) =>
            t.id === targetId ? { ...t, [field]: value } : t
        );
        onUpdate('scope', stringifyScopeItems(items));
    };

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        try {
            const summary = await generateExecutiveSummary(llmConfig, findings);
            onUpdate('executiveSummary', summary);
        } catch (err) {
            console.error('Failed to generate executive summary:', err);
        } finally {
            setGeneratingSummary(false);
        }
    };
    return (
        <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative print:bg-white print:text-black">
            <div className="flex-1 overflow-y-auto print:overflow-visible">
                <div className="max-w-4xl mx-auto px-12 py-16 print:p-0 print:max-w-none">

                    {/* Page Title */}
                    <div className="mb-12 print:mb-6">
                        <h1 className="text-4xl font-bold text-white print:text-black flex items-center gap-3 mb-2">
                            <Settings className="w-8 h-8 text-emerald-500 print:hidden" />
                            Project Settings
                        </h1>
                        <p className="text-zinc-500 text-sm print:hidden">
                            General report information and executive summary.
                        </p>
                    </div>

                    {/* Form Grid */}
                    <div className="space-y-10">

                        {/* Row: Project Name */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                <FileText className="w-4 h-4" /> Project Name
                            </label>
                            <input
                                type="text"
                                value={project.name}
                                onChange={(e) => onUpdate('name', e.target.value)}
                                placeholder="e.g. Acme Corp Web Application Penetration Test"
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-600"
                            />
                        </div>

                        {/* Two-column grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                    <Users className="w-4 h-4" /> Client Name
                                </label>
                                <input
                                    type="text"
                                    value={project.clientName}
                                    onChange={(e) => onUpdate('clientName', e.target.value)}
                                    placeholder="e.g. Acme Corporation"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-600"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                    <Shield className="w-4 h-4" /> Assessor / Firm
                                </label>
                                <input
                                    type="text"
                                    value={project.assessorName}
                                    onChange={(e) => onUpdate('assessorName', e.target.value)}
                                    placeholder="e.g. John Doe / SecureTech Inc."
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-600"
                                />
                            </div>
                        </div>

                        {/* Dates Row */}
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                    <Calendar className="w-4 h-4" /> Assessment Start
                                </label>
                                <input
                                    type="date"
                                    value={project.assessmentDateStart}
                                    onChange={(e) => onUpdate('assessmentDateStart', e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                    <Calendar className="w-4 h-4" /> Assessment End
                                </label>
                                <input
                                    type="date"
                                    value={project.assessmentDateEnd}
                                    onChange={(e) => onUpdate('assessmentDateEnd', e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                    <Calendar className="w-4 h-4" /> Report Date
                                </label>
                                <input
                                    type="date"
                                    value={project.reportDate}
                                    onChange={(e) => onUpdate('reportDate', e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Version, Test Type & Project Type */}
                        <div className={`grid ${multi ? 'grid-cols-2' : 'grid-cols-3'} gap-6`}>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                    <Bookmark className="w-4 h-4" /> Report Version
                                </label>
                                <input
                                    type="text"
                                    value={project.reportVersion}
                                    onChange={(e) => onUpdate('reportVersion', e.target.value)}
                                    placeholder="e.g. 1.0"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-600"
                                />
                            </div>
                            <div>
                                {!multi && (
                                    <>
                                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                            <Boxes className="w-4 h-4" /> Test Type
                                        </label>
                                        <select
                                            value={project.testType}
                                            onChange={(e) => onUpdate('testType', e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                                        >
                                            <option value="" className="bg-zinc-900">Not specified</option>
                                            <option value="Black-box" className="bg-zinc-900">Black-box</option>
                                            <option value="Grey-box" className="bg-zinc-900">Grey-box</option>
                                            <option value="White-box" className="bg-zinc-900">White-box</option>
                                        </select>
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                                    <Target className="w-4 h-4" /> Project Type
                                </label>
                                <select
                                    value={project.targetType}
                                    onChange={(e) => onUpdate('targetType', e.target.value as ProjectTargetType)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="single-target" className="bg-zinc-900">Single target</option>
                                    <option value="multi-target" className="bg-zinc-900">Multi target</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-zinc-800/50" />

                        {/* Scope / Targets */}
                        <div>
                            <h3 className="flex items-center text-lg font-semibold text-zinc-100 print:text-black mb-3">
                                <Shield className="w-5 h-5 mr-2 text-blue-400/70 print:hidden" /> Scope
                            </h3>
                            {project.targetType === 'multi-target' && (
                                <p className="text-xs text-zinc-500 mb-3">
                                    Each in-scope target represents a target that will be used to group findings in the report. Select a target on each finding to assign it.
                                </p>
                            )}
                            <ScopeList
                                value={project.scope}
                                onChange={(value) => onUpdate('scope', value)}
                            />
                            {project.targetType === 'multi-target' && targets.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                                        <Boxes className="w-4 h-4" /> Test Type per target
                                    </h4>
                                    {targets.map((t) => (
                                        <div key={t.id} className="flex items-center gap-4">
                                            <span className="w-64 shrink-0 font-mono text-xs text-zinc-300 truncate" title={t.value}>{t.value || '(unnamed target)'}</span>
                                            <select
                                                value={t.testType || ''}
                                                onChange={(e) => updateTargetField(t.id, 'testType', e.target.value)}
                                                className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-zinc-900">Not specified</option>
                                                <option value="Black-box" className="bg-zinc-900">Black-box</option>
                                                <option value="Grey-box" className="bg-zinc-900">Grey-box</option>
                                                <option value="White-box" className="bg-zinc-900">White-box</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tools / Resources Used */}
                        <div>
                            <h3 className="flex items-center text-lg font-semibold text-zinc-100 print:text-black mb-3">
                                <Wrench className="w-5 h-5 mr-2 text-amber-400/70 print:hidden" /> Tools / Resources Used
                            </h3>
                            <RichTextEditor
                                content={project.toolsResources}
                                placeholder="Tools and resources used during the assessment (e.g. Burp Suite, Nmap, Nuclei, OWASP Testing Guide)..."
                                onChange={(value) => onUpdate('toolsResources', value)}
                            />
                        </div>

                        {/* Executive Summary */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="flex items-center text-lg font-semibold text-zinc-100 print:text-black">
                                    <FileText className="w-5 h-5 mr-2 text-emerald-400/70 print:hidden" /> Executive Summary
                                </h3>
                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={generatingSummary || findings.length === 0}
                                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 px-3 py-2 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors disabled:opacity-50 print:hidden"
                                >
                                    {generatingSummary ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Bot className="w-3.5 h-3.5" />
                                    )}
                                    {generatingSummary ? 'Generating...' : 'Generate with AI'}
                                </button>
                            </div>
                            {multi && (
                                <p className="text-xs text-zinc-500 mb-3">General overview of the assessment. Add a summary per target below.</p>
                            )}
                            <RichTextEditor
                                content={project.executiveSummary}
                                placeholder="High-level overview of the assessment for non-technical stakeholders (C-level executives)..."
                                onChange={(value) => onUpdate('executiveSummary', value)}
                            />
                            {multi && targets.map((t, i) => (
                                <div key={t.id} className="mt-8">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-100 mb-2">
                                        <Target className="w-4 h-4 text-blue-400/70" />
                                        <span className="text-zinc-500 font-mono">1.{i + 1}</span>
                                        <span className="break-all">{t.value}</span>
                                        <span className="text-[10px] font-normal text-zinc-600">{t.type}</span>
                                    </h4>
                                    <RichTextEditor
                                        content={t.executiveSummary || ''}
                                        placeholder={`Executive summary for ${t.value || 'this target'}...`}
                                        onChange={(value) => updateTargetField(t.id, 'executiveSummary', value)}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Conclusion */}
                        <div>
                            <h3 className="flex items-center text-lg font-semibold text-zinc-100 print:text-black mb-3">
                                <Flag className="w-5 h-5 mr-2 text-rose-400/70 print:hidden" /> Conclusion
                            </h3>
                            {multi && (
                                <p className="text-xs text-zinc-500 mb-3">General conclusion (optional). Add a conclusion per target below.</p>
                            )}
                            <RichTextEditor
                                content={project.conclusion}
                                placeholder="Overall conclusion of the assessment, next steps, and closing remarks (optional - omitted from the report if empty)..."
                                onChange={(value) => onUpdate('conclusion', value)}
                            />
                            {multi && targets.map((t, i) => (
                                <div key={t.id} className="mt-8">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-100 mb-2">
                                        <Target className="w-4 h-4 text-blue-400/70" />
                                        <span className="text-zinc-500 font-mono">5.{i + 1}</span>
                                        <span className="break-all">{t.value}</span>
                                        <span className="text-[10px] font-normal text-zinc-600">{t.type}</span>
                                    </h4>
                                    <RichTextEditor
                                        content={t.conclusion || ''}
                                        placeholder={`Conclusion for ${t.value || 'this target'}...`}
                                        onChange={(value) => updateTargetField(t.id, 'conclusion', value)}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-zinc-800/50" />

                        {/* LLM Settings */}
                        <LlmSettings config={llmConfig} onSave={onUpdateLlmConfig} />

                    </div>
                </div>
            </div>
        </main>
    );
}
