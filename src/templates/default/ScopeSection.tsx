import type { ReportData } from '../reportTypes';
import { parseScopeItems } from '../../types';
import { captionFigures } from '../../lib/figures';

export function ScopeSection({ data }: { data: ReportData }) {
    const items = parseScopeItems(data.project.scope);
    const inScope = items.filter((i) => i.included);
    const outOfScope = items.filter((i) => !i.included);

    const testType = data.project.testType;

    if (items.length === 0) {
        return (
            <div className="report-page px-16 py-16">
                <h2 className="text-3xl font-bold mb-8 pb-4 border-b-2 border-black">2. Scope</h2>
                {testType && (
                    <p className="mb-4 text-sm"><span className="font-bold">Test Type:</span> {testType}</p>
                )}
                <p className="text-gray-400 italic">No scope information provided.</p>
            </div>
        );
    }

    return (
        <div className="report-page px-16 py-16">
            <h2 className="text-3xl font-bold mb-8 pb-4 border-b-2 border-black">2. Scope</h2>

            {/* Test Type */}
            {testType && (
                <p className="mb-6 text-sm"><span className="font-bold">Test Type:</span> {testType}</p>
            )}

            {/* In Scope */}
            {inScope.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 text-gray-800">In Scope</h3>
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2 font-bold w-28">Type</th>
                                <th className="text-left py-2 font-bold">Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inScope.map((item) => (
                                <tr key={item.id} className="border-b border-gray-200">
                                    <td className="py-2 text-gray-500">
                                        {item.type}
                                    </td>
                                    <td className="py-2 font-mono text-sm break-all">{item.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Out of Scope */}
            {outOfScope.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-800">Out of Scope</h3>
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2 font-bold w-28">Type</th>
                                <th className="text-left py-2 font-bold">Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            {outOfScope.map((item) => (
                                <tr key={item.id} className="border-b border-gray-200">
                                    <td className="py-2 text-gray-500">
                                        {item.type}
                                    </td>
                                    <td className="py-2 font-mono text-sm break-all">{item.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tools / Resources Used */}
            {data.project.toolsResources && (
                <div className={items.some((i) => i.included) || outOfScope.length > 0 ? 'mt-8' : ''}>
                    <h3 className="text-lg font-bold mb-3 text-gray-800">Tools / Resources Used</h3>
                    <div className="prose max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: captionFigures(data.project.toolsResources, '2').html }} />
                </div>
            )}
        </div>
    );
}
