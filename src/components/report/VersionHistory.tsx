import { useState } from 'react';
import { X, Save, Trash2, RotateCcw, Eye, Clock, User, FileText } from 'lucide-react';
import type { ReportVersion, Project, Finding } from '../../types';
import { useReportVersions } from '../../hooks/useReportVersions';
import { buildReportData } from '../../templates/reportTypes';
import { listTemplates } from '../../templates/registry';

interface VersionHistoryProps {
    project: Project;
    findings: Finding[];
    onClose: () => void;
    onRestore: (version: ReportVersion) => void;
}

export default function VersionHistory({ project, findings, onClose, onRestore }: VersionHistoryProps) {
    const { versions, isLoading, saveVersion, deleteVersion, suggestNextVersion } = useReportVersions(project.id);
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [label, setLabel] = useState('');
    const [notes, setNotes] = useState('');
    const [previewVersion, setPreviewVersion] = useState<ReportVersion | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const templates = listTemplates();
    const TemplateComponent = templates[0]?.component;

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveVersion(project, findings, label, notes);
            setShowSaveForm(false);
            setLabel('');
            setNotes('');
        } catch (err) {
            console.error('Failed to save version:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteVersion(id);
        setDeleteConfirmId(null);
        if (previewVersion?.id === id) setPreviewVersion(null);
    };

    const handleRestore = (version: ReportVersion) => {
        onRestore(version);
        onClose();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    if (previewVersion && TemplateComponent) {
        const data = buildReportData(previewVersion.snapshot.project, previewVersion.snapshot.findings);
        return (
            <div className="fixed inset-0 z-[110] flex flex-col bg-zinc-950">
                <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPreviewVersion(null)}
                            className="text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                            Back to versions
                        </button>
                        <span className="text-zinc-600">|</span>
                        <h2 className="text-sm font-semibold text-white">
                            Preview: v{previewVersion.version} - {previewVersion.label}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleRestore(previewVersion)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Restore This Version
                        </button>
                        <button
                            onClick={() => setPreviewVersion(null)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-zinc-800/30">
                    <div className="max-w-[210mm] mx-auto my-8 bg-white text-black shadow-2xl">
                        <TemplateComponent data={data} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[80vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Report Versions</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {versions.length} version{versions.length !== 1 ? 's' : ''} saved
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSaveForm(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save Current as Version
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Save Form */}
                {showSaveForm && (
                    <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-800/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-zinc-400">Version:</span>
                            <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                                v{suggestNextVersion(versions)}
                            </span>
                        </div>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Version label (e.g., Initial Draft, Client Review)"
                            className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 mb-2"
                            autoFocus
                        />
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes (optional)..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 resize-none mb-3"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => { setShowSaveForm(false); setLabel(''); setNotes(''); }}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Save className="w-3 h-3" />
                                {saving ? 'Saving...' : 'Save Version'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Version List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isLoading ? (
                        <div className="text-center text-zinc-500 text-sm py-8">Loading versions...</div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-500 text-sm">No versions saved yet</p>
                            <p className="text-zinc-600 text-xs mt-1">Save the current report state as a version to track changes over time</p>
                        </div>
                    ) : (
                        versions.map((version) => (
                            <div
                                key={version.id}
                                className="group flex items-start gap-4 p-4 bg-zinc-800/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                        v{version.version}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{version.label}</h3>
                                    {version.notes && (
                                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{version.notes}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(version.createdAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {version.createdBy}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            {version.snapshot.findings.length} findings
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setPreviewVersion(version)}
                                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                        title="Preview"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleRestore(version)}
                                        className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700 rounded-lg transition-colors"
                                        title="Restore"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                    {deleteConfirmId === version.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleDelete(version.id)}
                                                className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmId(null)}
                                                className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirmId(version.id)}
                                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
