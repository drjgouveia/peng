import type { Finding } from '../../types';
import { captionFigures } from '../../lib/figures';

interface FindingDetailProps {
    finding: Finding;
    index: number;
}

export function FindingDetail({ finding, index }: FindingDetailProps) {
    const f = finding;

    // Number figures sequentially across all content sections of this finding
    const prefix = `4.${index + 1}`;
    const sectionHtmls = [f.description, f.businessSummary, f.impact, f.remediation, f.references, f.poc];
    const imgCounts = sectionHtmls.map((html) => (html.match(/<img\b/g) || []).length);
    const starts = imgCounts.map((_, i) => imgCounts.slice(0, i).reduce((a, b) => a + b, 1));
    const [description, businessSummary, impact, remediation, references, poc] = sectionHtmls.map(
        (html, i) => captionFigures(html, prefix, starts[i]).html
    );

    return (
        <div className="report-page px-16 py-16">
            {/* Finding Header */}
            <div className="mb-8 pb-4 border-b-2 border-black">
                <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold">
                        <span className="text-gray-400 mr-2">4.{index + 1}</span>
                        {f.title || 'Untitled Finding'}
                    </h3>
                    <span className={`text-sm font-bold uppercase px-3 py-1 rounded ${f.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                        f.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                            f.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                f.severity === 'Low' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                        }`}>
                        {f.severity}
                    </span>
                </div>
            </div>

            {/* Metadata Table */}
            <table className="text-sm w-full mb-8 border-collapse">
                <tbody>
                    <MetaRow label="Severity" value={f.severity} />
                    {f.cvss && <MetaRow label="CVSS Score" value={f.cvss} />}
                    {f.cvssVector && <MetaRow label="CVSS Vector" value={f.cvssVector} />}
                    {f.cve && <MetaRow label="CVE" value={f.cve} />}
                    {f.cwe && <MetaRow label="CWE" value={f.cwe} />}
                    {f.endpoints.length > 0 && f.endpoints.map((ep, i) => (
                        <MetaRow key={ep.id} label={i === 0 ? 'Endpoint' : ''} value={`${ep.method ? ep.method + ' ' : ''}${ep.url}`} />
                    ))}
                    {f.parameter && <MetaRow label="Parameter" value={f.parameter} />}
                    {f.affectedHost && <MetaRow label="Affected Host" value={f.affectedHost} />}
                    {f.port && <MetaRow label="Port" value={f.port} />}
                </tbody>
            </table>

            {/* Content Sections */}
            <div className="space-y-8">
                {description && <ContentSection title="Description" html={description} />}
                {businessSummary && <ContentSection title="Business Summary" html={businessSummary} />}
                {f.requestResponses.length > 0 && f.requestResponses.map((rr, i) => (
                    <div key={rr.id}>
                        <h4 className="text-lg font-bold mb-3 text-gray-800">Request / Response {f.requestResponses.length > 1 ? `#${i + 1}` : ''}</h4>
                        {rr.request && (
                            <div className="mb-3">
                                <h5 className="text-sm font-semibold text-gray-600 mb-1">Request</h5>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">{rr.request}</pre>
                            </div>
                        )}
                        {rr.response && (
                            <div>
                                <h5 className="text-sm font-semibold text-gray-600 mb-1">Response</h5>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">{rr.response}</pre>
                            </div>
                        )}
                    </div>
                ))}
                {impact && <ContentSection title="Impact" html={impact} />}
                {remediation && <ContentSection title="Remediation" html={remediation} />}
                {references && <ContentSection title="References" html={references} />}
                {poc && <ContentSection title="Proof of Concept" html={poc} />}
            </div>
        </div>
    );
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <tr className="border-b border-gray-100">
            <td className="py-1.5 pr-6 font-semibold text-gray-600 w-40">{label}</td>
            <td className="py-1.5 break-all">{value}</td>
        </tr>
    );
}

function ContentSection({ title, html }: { title: string; html: string }) {
    return (
        <div>
            <h4 className="text-lg font-bold mb-3 text-gray-800">{title}</h4>
            <div className="prose report-prose max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}
