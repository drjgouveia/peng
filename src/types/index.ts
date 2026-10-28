export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type FindingStatus = 'Open' | 'Fixed' | 'Accepted Risk';
export type ScopeType = 'Web App' | 'API' | 'Network' | 'Mobile' | 'AI' | 'Other';
export type TestType = 'Black-box' | 'Grey-box' | 'White-box';
export type ProjectTargetType = 'single-target' | 'multi-target';

export interface ScopeItem {
    id: string;
    value: string;
    type: ScopeType;
    included: boolean; // true = In Scope, false = Out of Scope
    // Per-target narrative (multi-target projects, in-scope targets only)
    executiveSummary?: string;
    conclusion?: string;
    // Per-target test methodology (multi-target projects; '' = not specified)
    testType?: string;
}

export function parseScopeItems(scope: string): ScopeItem[] {
    try {
        const parsed = JSON.parse(scope);
        if (Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
    return [];
}

export function stringifyScopeItems(items: ScopeItem[]): string {
    return JSON.stringify(items);
}

export interface Project {
    id: string;
    name: string;
    clientName: string;
    assessorName: string;
    assessmentDateStart: string;
    assessmentDateEnd: string;
    reportDate: string;
    reportVersion: string;
    testType: string; // '' = not specified
    targetType: ProjectTargetType; // single-target = one target; multi-target = findings grouped per target
    scope: string;
    toolsResources: string;
    executiveSummary: string;
    conclusion: string;
    createdAt: string;
    updatedAt: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface Endpoint {
    id: string;
    method: HttpMethod;
    url: string;
}

export interface RequestResponseEntry {
    id: string;
    request: string;
    response: string;
}

export interface Finding {
    id: string;
    projectId: string;
    title: string;
    severity: Severity;
    status: FindingStatus;
    targetId: string; // id of the in-scope ScopeItem (target) this finding belongs to ('' when single-target/unassigned)
    // Metadata properties
    endpoints: Endpoint[];
    parameter: string;
    affectedHost: string;
    port: string;
    cve: string;
    cwe: string;
    cvss: string;
    cvssVector?: string;
    references: string;
    // Content blocks
    description: string;
    poc: string;
    requestResponses: RequestResponseEntry[];
    businessSummary: string;
    impact: string;
    remediation: string;
    notes: string;
    createdAt: string;
}

export interface SeverityColor {
    bg: string;
    text: string;
    border: string;
    dot: string;
}

export type SeverityColorMap = Record<Severity, SeverityColor>;

export function createDefaultProject(name: string): Project {
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        name,
        clientName: '',
        assessorName: '',
        assessmentDateStart: '',
        assessmentDateEnd: '',
        reportDate: now.split('T')[0],
        reportVersion: '1.0',
        testType: '',
        targetType: 'single-target',
        scope: '',
        toolsResources: '',
        executiveSummary: '',
        conclusion: '',
        createdAt: now,
        updatedAt: now,
    };
}

export interface ReportVersion {
    id: string;
    projectId: string;
    version: string;
    label: string;
    notes: string;
    createdAt: string;
    createdBy: string;
    snapshot: {
        project: Project;
        findings: Finding[];
    };
}

export function createDefaultFinding(projectId: string): Finding {
    return {
        id: crypto.randomUUID(),
        projectId,
        title: '',
        severity: 'Medium',
        status: 'Open',
        targetId: '',
        endpoints: [],
        parameter: '',
        affectedHost: '',
        port: '',
        cve: '',
        cwe: '',
        cvss: '',
        cvssVector: '',
        references: '',
        description: '',
        poc: '',
        requestResponses: [],
        businessSummary: '',
        impact: '',
        remediation: '',
        notes: '',
        createdAt: new Date().toISOString(),
    };
}
