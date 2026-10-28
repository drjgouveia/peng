import type { ReportData } from '../reportTypes';
import { buildFindingGroups, UNASSIGNED_TARGET_LABEL } from '../reportTypes';
import type { Severity } from '../../types';

const SEV_COLORS: Record<Severity, string> = {
    Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#3b82f6', Info: '#9ca3af',
};

export function FindingSummary({ data }: { data: ReportData }) {
    // Multi-target projects: one subsection per target
    const groups = buildFindingGroups(data.project, data.findings);
    const multi = groups.length > 0;

    return (
        <div className="report-page px-16 py-16">
            <h2 className="text-3xl font-bold mb-8 pb-4 border-b-2 border-black">3. Summary of Findings</h2>

            {multi ? (
                groups.map((g) => (
                    <div key={g.target?.id ?? `unassigned-${g.section}`} className="mt-8 first:mt-0">
                        <h3 className="text-xl font-bold border-b border-black pb-2 mb-4">
                            <span className="text-gray-400 mr-2">3.{g.section}</span>
                            {g.target ? g.target.value : UNASSIGNED_TARGET_LABEL}
                        </h3>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b-2 border-black">
                                    <th className="text-left py-2 font-bold w-16">#</th>
                                    <th className="text-left py-2 font-bold">Finding Title</th>
                                    <th className="text-center py-2 font-bold w-24">Severity</th>
                                    <th className="text-center py-2 font-bold w-16">CVSS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {g.findings.map((f, i) => (
                                    <tr key={f.id} className="border-b border-gray-200">
                                        <td className="py-2 text-gray-500">{`4.${g.section}.${i + 1}`}</td>
                                        <td className="py-2 font-medium">{f.title || 'Untitled'}</td>
                                        <td className="py-2 text-center">
                                            <SeverityBadge severity={f.severity} />
                                        </td>
                                        <td className="py-2 text-center font-mono text-xs">{f.cvss || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            ) : (
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="text-left py-2 font-bold w-10">#</th>
                            <th className="text-left py-2 font-bold">Finding Title</th>
                            <th className="text-center py-2 font-bold w-24">Severity</th>

                            <th className="text-center py-2 font-bold w-16">CVSS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.findings.map((f, i) => (
                            <tr key={f.id} className="border-b border-gray-200">
                                <td className="py-2 text-gray-500">{i + 1}</td>
                                <td className="py-2 font-medium">{f.title || 'Untitled'}</td>
                                <td className="py-2 text-center">
                                    <SeverityBadge severity={f.severity} />
                                </td>

                                <td className="py-2 text-center font-mono text-xs">{f.cvss || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {data.findings.length === 0 && (
                <p className="text-gray-400 italic mt-6">No findings recorded.</p>
            )}
        </div>
    );
}

function SeverityBadge({ severity }: { severity: Severity }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: SEV_COLORS[severity] }} />
            {severity}
        </span>
    );
}
