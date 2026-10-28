import type { Project, Finding, Severity, FindingStatus, ScopeItem } from '../types';
import { parseScopeItems } from '../types';

export interface ReportStats {
    total: number;
    bySeverity: Record<Severity, number>;
    byStatus: Record<FindingStatus, number>;
}

export interface ReportData {
    project: Project;
    findings: Finding[];
    generatedAt: string;
    stats: ReportStats;
}

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    component: React.ComponentType<{ data: ReportData }>;
}

export function buildReportData(project: Project, findings: Finding[]): ReportData {
    const severityOrder: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };

    // Sort by severity, exclude notes from output
    const sorted = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const stats: ReportStats = {
        total: sorted.length,
        bySeverity: { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 },
        byStatus: { Open: 0, Fixed: 0, 'Accepted Risk': 0 },
    };
    for (const f of sorted) {
        stats.bySeverity[f.severity]++;
        stats.byStatus[f.status]++;
    }

    return {
        project,
        findings: sorted,
        generatedAt: new Date().toISOString(),
        stats,
    };
}

/**
 * A group of findings belonging to one target (multi-target projects).
 * `target` is null for the "unassigned" group (findings with no target or
 * whose target was removed from the scope).
 */
export interface FindingGroup {
    target: ScopeItem | null;
    section: number; // 1-based section number (target 1 -> 4.1, etc.)
    findings: Finding[];
}

export const UNASSIGNED_TARGET_LABEL = 'Unassigned targets';

/**
 * Groups findings by their in-scope targets, in scope order, for
 * multi-target projects. Returns [] for single-target projects.
 * Findings keep the order they were passed in (already severity-sorted).
 */
export function buildFindingGroups(project: Project, findings: Finding[]): FindingGroup[] {
    if (project.targetType !== 'multi-target') return [];

    const inScope = parseScopeItems(project.scope).filter((t) => t.included);
    const groups: FindingGroup[] = inScope.map((target, i) => ({
        target,
        section: i + 1,
        findings: findings.filter((f) => f.targetId === target.id),
    }));

    // Findings not mapped to any target (or whose target left the scope)
    const assigned = new Set(groups.flatMap((g) => g.findings.map((f) => f.id)));
    const unassigned = findings.filter((f) => !assigned.has(f.id));
    if (unassigned.length > 0) {
        groups.push({ target: null, section: groups.length + 1, findings: unassigned });
    }

    // Skip targets with no findings so section numbering stays contiguous
    return groups.filter((g) => g.findings.length > 0);
}

/** Sub-label for a target heading: "<type> · <testType>" (either part may be absent). */
export function targetMeta(target: ScopeItem): string {
    return [target.type, target.testType].filter(Boolean).join(' · ');
}
