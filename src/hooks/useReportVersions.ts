import { useState, useEffect, useCallback } from 'react';
import { getProjectReportVersions, saveReportVersion, deleteReportVersion as dbDeleteReportVersion } from '../lib/db';
import type { ReportVersion, Project, Finding } from '../types';

export interface UseReportVersionsReturn {
    versions: ReportVersion[];
    isLoading: boolean;
    saveVersion: (project: Project, findings: Finding[], label: string, notes: string) => Promise<ReportVersion>;
    deleteVersion: (id: string) => Promise<void>;
    getLatestVersion: (projectId: string) => ReportVersion | undefined;
    suggestNextVersion: (existingVersions: ReportVersion[]) => string;
}

export function useReportVersions(projectId: string | null): UseReportVersionsReturn {
    const [versions, setVersions] = useState<ReportVersion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            return;
        }
        let cancelled = false;
        getProjectReportVersions(projectId)
            .then((v) => { if (!cancelled) setVersions(v); })
            .catch((err) => console.error('Failed to load report versions:', err))
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [projectId]);

    const suggestNextVersionFn = useCallback((existingVersions: ReportVersion[]) => {
        if (existingVersions.length === 0) return '1.0';
        const latest = existingVersions
            .filter((v) => v.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (!latest) return '1.0';
        const parts = latest.version.split('.').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return `${parts[0]}.${parts[1] + 1}`;
        }
        return `${parts[0] || 1}.1`;
    }, [projectId]);

    const saveVersionFn = useCallback(async (
        project: Project,
        findings: Finding[],
        label: string,
        notes: string
    ): Promise<ReportVersion> => {
        const version: ReportVersion = {
            id: crypto.randomUUID(),
            projectId: project.id,
            version: suggestNextVersionFn(versions),
            label,
            notes,
            createdAt: new Date().toISOString(),
            createdBy: project.assessorName || 'Unknown',
            snapshot: {
                project: JSON.parse(JSON.stringify(project)),
                findings: JSON.parse(JSON.stringify(findings)),
            },
        };
        await saveReportVersion(version);
        setVersions((prev) => [version, ...prev]);
        return version;
    }, [versions, suggestNextVersionFn]);

    const deleteVersionFn = useCallback(async (id: string) => {
        await dbDeleteReportVersion(id);
        setVersions((prev) => prev.filter((v) => v.id !== id));
    }, []);

    const getLatestVersion = useCallback((pid: string) => {
        return versions
            .filter((v) => v.projectId === pid)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }, [versions]);

    return {
        versions,
        isLoading,
        saveVersion: saveVersionFn,
        deleteVersion: deleteVersionFn,
        getLatestVersion,
        suggestNextVersion: suggestNextVersionFn,
    };
}
