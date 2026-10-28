import { useState, useEffect, useRef } from 'react';
import { getProjectFindings, saveProjectFindings } from '../lib/db';
import { createDefaultFinding, type Finding } from '../types';

const DEBOUNCE_MS = 500;

export interface UseFindingsReturn {
    findings: Finding[];
    setFindings: React.Dispatch<React.SetStateAction<Finding[]>>;
    isLoading: boolean;
    lastSaved: Date | null;
}

export function useFindings(projectId: string | null): UseFindingsReturn {
    const [findings, setFindings] = useState<Finding[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const isInitialLoad = useRef(true);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentProjectId = useRef(projectId);

    // Load findings when projectId changes
    useEffect(() => {
        currentProjectId.current = projectId;
        isInitialLoad.current = true;
        setLastSaved(null);

        if (!projectId) {
            setFindings([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        getProjectFindings(projectId)
            .then((stored) => {
                // Normalize each finding against defaults so fields added later
                // (e.g. targetId) exist on older records
                const normalized = stored.map((f) => ({ ...createDefaultFinding(projectId), ...f }));
                // Sort by createdAt descending (newest first)
                normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setFindings(normalized);
            })
            .catch((err) => {
                console.error('Failed to load findings:', err);
            })
            .finally(() => {
                setIsLoading(false);
                setTimeout(() => {
                    isInitialLoad.current = false;
                }, 0);
            });
    }, [projectId]);

    // Auto-save findings with debounce
    useEffect(() => {
        if (isInitialLoad.current || !currentProjectId.current) return;

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            if (currentProjectId.current) {
                saveProjectFindings(currentProjectId.current, findings)
                    .then(() => setLastSaved(new Date()))
                    .catch((err) => console.error('Failed to save findings:', err));
            }
        }, DEBOUNCE_MS);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [findings]);

    return { findings, setFindings, isLoading, lastSaved };
}
