import { Fragment } from 'react';
import type { ReportData } from '../reportTypes';
import { buildFindingGroups, targetMeta, UNASSIGNED_TARGET_LABEL } from '../reportTypes';
import { CoverPage } from './CoverPage';
import { TableOfContents } from './TableOfContents';
import { ExecutiveSummary } from './ExecutiveSummary';
import { ScopeSection } from './ScopeSection';
import { FindingSummary } from './FindingSummary';
import { FindingDetail } from './FindingDetail';
import { ConclusionSection } from './ConclusionSection';

export function DefaultTemplate({ data }: { data: ReportData }) {
    // Multi-target projects group findings into per-target sections;
    // single-target projects use the flat numbering (4.1, 4.2, ...)
    const groups = buildFindingGroups(data.project, data.findings);
    const multi = groups.length > 0;

    return (
        <div className="report-document">
            <CoverPage data={data} />
            <TableOfContents data={data} />
            <ExecutiveSummary data={data} />
            <ScopeSection data={data} />
            <FindingSummary data={data} />
            {multi
                ? groups.map((g) => (
                    <Fragment key={g.target?.id ?? `unassigned-${g.section}`}>
                        {g.findings.map((f, i) => (
                            <FindingDetail
                                key={f.id}
                                finding={f}
                                index={i}
                                number={`4.${g.section}.${i + 1}`}
                                groupNumber={`4.${g.section}`}
                                groupTitle={g.target ? g.target.value : UNASSIGNED_TARGET_LABEL}
                                groupSub={g.target ? targetMeta(g.target) : undefined}
                                isGroupStart={i === 0}
                            />
                        ))}
                    </Fragment>
                ))
                : data.findings.map((finding, index) => (
                    <FindingDetail key={finding.id} finding={finding} index={index} />
                ))}
            <ConclusionSection data={data} />
        </div>
    );
}
