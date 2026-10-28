import type { ReportData } from '../reportTypes';
import type { ScopeItem } from '../../types';
import { parseScopeItems } from '../../types';
import { captionFigures } from '../../lib/figures';

export function ConclusionSection({ data }: { data: ReportData }) {
    const html = data.project.conclusion;
    // Multi-target projects: per-target conclusions as subsections 5.1, 5.2, ...
    const targetConclusions: ScopeItem[] =
        data.project.targetType === 'multi-target'
            ? parseScopeItems(data.project.scope).filter((t) => t.included && t.conclusion)
            : [];

    if (!html && targetConclusions.length === 0) return null;

    return (
        <div className="report-page px-16 py-16">
            <h2 className="text-3xl font-bold mb-8 pb-4 border-b-2 border-black">5. Conclusion</h2>
            {html && (
                <div className="prose max-w-none text-base leading-relaxed mb-12" dangerouslySetInnerHTML={{ __html: captionFigures(html, '5').html }} />
            )}
            {targetConclusions.map((t, i) => (
                <div key={t.id} className={i > 0 || html ? 'mt-10' : ''}>
                    <h3 className="text-xl font-bold border-b border-black pb-2 mb-4">
                        <span className="text-gray-400 mr-2">{`5.${i + 1}`}</span>
                        {t.value}
                        {t.type && <span className="text-xs text-gray-400 font-normal ml-2">({t.type})</span>}
                    </h3>
                    <div className="prose max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: captionFigures(t.conclusion!, `5.${i + 1}`).html }} />
                </div>
            ))}
        </div>
    );
}
