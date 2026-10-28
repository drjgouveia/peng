import type { ReportData } from '../reportTypes';
import { captionFigures } from '../../lib/figures';

export function ConclusionSection({ data }: { data: ReportData }) {
    const html = data.project.conclusion;
    if (!html) return null;

    return (
        <div className="report-page px-16 py-16">
            <h2 className="text-3xl font-bold mb-8 pb-4 border-b-2 border-black">5. Conclusion</h2>
            <div className="prose max-w-none text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: captionFigures(html, '5').html }} />
        </div>
    );
}
