import { useState, useEffect } from 'react';
import ConfirmModal from './components/ui/ConfirmModal';
import Sidebar from './components/sidebar/Sidebar';
import Editor from './components/editor/Editor';
import ProjectSettings from './components/settings/ProjectSettings';
import ProjectDashboard from './components/dashboard/ProjectDashboard';
import ReportPreview from './components/report/ReportPreview';
import VersionHistory from './components/report/VersionHistory';
import TemplateBrowser from './components/templates/TemplateBrowser';
import { useProjects } from './hooks/useProjects';
import { useFindings } from './hooks/useFindings';
import { useReportVersions } from './hooks/useReportVersions';
import { saveProjectFindings } from './lib/db';
import type { Finding, Project, Endpoint, RequestResponseEntry, HttpMethod, ReportVersion } from './types';
import { createDefaultFinding } from './types';
import type { FindingTemplate } from './constants';
import type { LlmConfig } from './lib/llm';
import { DEFAULT_LLM_CONFIG } from './lib/llm';

interface OldFinding {
    url?: string;
    method?: string;
    requestResponse?: string;
    [key: string]: unknown;
}

type ActiveView = 'editor' | 'settings';

export default function App() {
  const { projects, isLoading: projectsLoading, createProject, updateProject, deleteProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { findings, setFindings, isLoading: findingsLoading, lastSaved } = useFindings(activeProjectId);
  const { versions, saveVersion, deleteVersion, suggestNextVersion } = useReportVersions(activeProjectId);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [showReport, setShowReport] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSaveVersionForm, setShowSaveVersionForm] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => {
    try {
      const stored = localStorage.getItem('peng-llm-config');
      return stored ? JSON.parse(stored) : DEFAULT_LLM_CONFIG;
    } catch {
      return DEFAULT_LLM_CONFIG;
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+T / Ctrl+T → Toggle template browser
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        if (activeProjectId) setShowTemplateBrowser((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  // --- Finding handlers ---

  const handleAddFinding = (template: FindingTemplate | null = null) => {
    if (!activeProjectId) return;
    const base = createDefaultFinding(activeProjectId);
    const newFinding: Finding = template
      ? {
        ...base,
        title: template.title,
        severity: template.severity,
        description: template.description,
        impact: template.impact,
        remediation: template.remediation,
        businessSummary: template.businessSummary ?? '',
        cwe: template.cwe ?? '',
        cvss: template.cvss ?? '',
        references: template.references ?? '',
        endpoints: template.url ? [{ id: crypto.randomUUID(), method: (template.method as HttpMethod) || 'GET', url: template.url }] : [],
        parameter: template.parameter ?? '',
        affectedHost: template.affectedHost ?? '',
        port: template.port ?? '',
      }
      : base;
    setFindings((prev) => [newFinding, ...prev]);
    setSelectedFindingId(newFinding.id);
    setActiveView('editor');
  };

  const handleSelectFinding = (id: string) => {
    setSelectedFindingId(id);
    setActiveView('editor');
  };

  const [pendingDeleteFindingId, setPendingDeleteFindingId] = useState<string | null>(null);

  const handleDeleteFinding = (id: string) => {
    setPendingDeleteFindingId(id);
  };

  const confirmDeleteFinding = () => {
    if (pendingDeleteFindingId) {
      setFindings((prev) => prev.filter((f) => f.id !== pendingDeleteFindingId));
      if (selectedFindingId === pendingDeleteFindingId) setSelectedFindingId(null);
      setPendingDeleteFindingId(null);
    }
  };

const handleDuplicateFinding = (id: string) => {
    const original = findings.find((f) => f.id === id);
    if (!original) return;
    const duplicate: Finding = {
        ...original,
        id: crypto.randomUUID(),
        title: `${original.title} (Copy)`,
        endpoints: JSON.parse(JSON.stringify(original.endpoints)),
        requestResponses: JSON.parse(JSON.stringify(original.requestResponses)),
        createdAt: new Date().toISOString(),
    };
    setFindings((prev) => [duplicate, ...prev]);
    setSelectedFindingId(duplicate.id);
};

const handleUpdateFinding = (field: keyof Finding, value: string | Endpoint[] | RequestResponseEntry[]) => {
    setFindings((prev) =>
        prev.map((f) =>
            f.id === selectedFindingId ? { ...f, [field]: value } : f
        )
    );
};

  // --- Project handlers ---

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setSelectedFindingId(null);
    setSearchTerm('');
    setActiveView('editor');
  };

  const handleBackToProjects = () => {
    setActiveProjectId(null);
    setSelectedFindingId(null);
    setSearchTerm('');
  };

  const handleUpdateProject = (field: keyof Project, value: string) => {
    if (!activeProject) return;
    const updated = { ...activeProject, [field]: value };
    updateProject(updated);
  };

  const handleCreateProject = (name: string) => {
    const project = createProject(name);
    handleSelectProject(project.id);
  };

  // --- Version handlers ---

  const handleCreateVersion = () => {
    setShowSaveVersionForm(true);
  };

  const handleSaveVersion = async () => {
    if (!activeProject) return;
    setSavingVersion(true);
    try {
      await saveVersion(activeProject, findings, versionLabel, versionNotes);
      setShowSaveVersionForm(false);
      setVersionLabel('');
      setVersionNotes('');
    } catch (err) {
      console.error('Failed to save version:', err);
    } finally {
      setSavingVersion(false);
    }
  };

  const handleViewVersionHistory = () => {
    setShowVersionHistory(true);
  };

  const handleRestoreVersion = (restoredProject: Project, restoredFindings: Finding[]) => {
    updateProject(restoredProject);
    setFindings(restoredFindings);
  };

  const handleUpdateLlmConfig = (config: LlmConfig) => {
    setLlmConfig(config);
    localStorage.setItem('peng-llm-config', JSON.stringify(config));
  };

  // --- Export / Import ---

  const exportData = () => {
    if (!activeProject) return;
    const exportPayload = { project: activeProject, findings };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const name = activeProject.name || 'peng-report';
    link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.project && Array.isArray(parsed.findings)) {
          // Create a new project from imported data
          const imported = createProject(parsed.project.name || 'Imported Project');
          // Update imported project fields
          const full: Project = { ...imported, ...parsed.project, id: imported.id, createdAt: imported.createdAt, updatedAt: imported.updatedAt };
          // Assign findings to the new project
          const importedFindings: Finding[] = parsed.findings.map((f: Finding) => {
            const old = f as unknown as OldFinding;
            const migrated: Finding = {
                ...f,
                id: crypto.randomUUID(),
                projectId: imported.id,
                targetId: f.targetId || '',
                status: f.status || 'Open',
                createdAt: f.createdAt || new Date().toISOString(),
                endpoints: f.endpoints || [],
                requestResponses: f.requestResponses || [],
                businessSummary: f.businessSummary || '',
            };
            if (!migrated.endpoints.length && old.url) {
                migrated.endpoints = [{ id: crypto.randomUUID(), method: (old.method || 'GET') as HttpMethod, url: old.url }];
            }
            if (!migrated.requestResponses.length && old.requestResponse) {
                migrated.requestResponses = [{ id: crypto.randomUUID(), request: '', response: old.requestResponse }];
            }
            return migrated;
          });
          // Persist findings to the DB *before* switching projects, so the
          // per-project load effect picks them up (avoids the race where the
          // empty initial load overwrites the imported findings)
          await saveProjectFindings(imported.id, importedFindings);
          updateProject(full);
          setActiveProjectId(imported.id);
          setSelectedFindingId(null);
        } else {
          alert('Invalid or corrupted JSON file!');
        }
      } catch {
        alert('Invalid or corrupted JSON file!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Loading ---

  if (projectsLoading) {
    return (
      <div className="flex h-screen bg-[#09090b] items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  // --- Dashboard (no project selected) ---

  if (!activeProjectId || !activeProject) {
    return (
      <ProjectDashboard
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={deleteProject}
        onImport={importData}
      />
    );
  }

  // --- Project View ---

  if (findingsLoading) {
    return (
      <div className="flex h-screen bg-[#09090b] items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading project...</div>
      </div>
    );
  }

  const filteredFindings = findings.filter((f) =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedFinding = findings.find((f) => f.id === selectedFindingId) ?? null;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-emerald-500/30">
      <Sidebar
        projectName={activeProject.name}
        findings={filteredFindings}
        selectedFindingId={activeView === 'editor' ? selectedFindingId : null}
        activeView={activeView}
        searchTerm={searchTerm}
        lastSaved={lastSaved}
        onSearchChange={setSearchTerm}
        onSelectFinding={handleSelectFinding}
        onAddFinding={() => handleAddFinding()}
        onBrowseTemplates={() => setShowTemplateBrowser(true)}
        onOpenSettings={() => setActiveView('settings')}
        onExport={exportData}
        onBackToProjects={handleBackToProjects}
        onGenerateReport={() => setShowReport(true)}
        onDeleteFinding={handleDeleteFinding}
        onDuplicateFinding={handleDuplicateFinding}
        onCreateVersion={handleCreateVersion}
        onViewVersionHistory={handleViewVersionHistory}
      />
      {activeView === 'settings' ? (
        <ProjectSettings
          project={activeProject}
          findings={findings}
          onUpdate={handleUpdateProject}
          llmConfig={llmConfig}
          onUpdateLlmConfig={handleUpdateLlmConfig}
        />
      ) : (
        <Editor
          selectedFinding={selectedFinding}
          project={activeProject}
          onUpdateField={handleUpdateFinding}
          onDelete={handleDeleteFinding}
          onDuplicate={handleDuplicateFinding}
          llmConfig={llmConfig}
        />
      )}
      {showReport && (
        <ReportPreview
          project={activeProject}
          findings={findings}
          onClose={() => setShowReport(false)}
          onRestoreVersion={(restoredProject, restoredFindings) => {
            updateProject(restoredProject);
            setFindings(restoredFindings);
          }}
        />
      )}
      {showTemplateBrowser && (
        <TemplateBrowser
          onSelect={(template) => handleAddFinding(template)}
          onClose={() => setShowTemplateBrowser(false)}
        />
      )}
      {showVersionHistory && activeProject && (
        <VersionHistory
          project={activeProject}
          findings={findings}
          onClose={() => setShowVersionHistory(false)}
          onRestore={(version) => {
            handleRestoreVersion(version.snapshot.project, version.snapshot.findings);
            setShowVersionHistory(false);
          }}
        />
      )}
      {showSaveVersionForm && activeProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Create Report Version</h2>
            <p className="text-xs text-zinc-500 mb-4">
              Next version: <span className="font-mono text-emerald-400">v{suggestNextVersion(versions)}</span>
            </p>
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="Version label (e.g., Initial Draft, Client Review)"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 mb-3"
              autoFocus
            />
            <textarea
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Notes (optional)..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 resize-none mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowSaveVersionForm(false); setVersionLabel(''); setVersionNotes(''); }}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVersion}
                disabled={savingVersion}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {savingVersion ? 'Saving...' : 'Save Version'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!pendingDeleteFindingId}
        title="Delete Finding"
        message="This finding will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteFinding}
        onCancel={() => setPendingDeleteFindingId(null)}
      />
    </div>
  );
}
