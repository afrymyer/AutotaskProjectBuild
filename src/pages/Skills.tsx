import { useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { useSkillsData } from '../lib/data';
import type { ResourceSkill } from '../lib/types';
import { PageHero } from '../components/PageHero';

export function SkillsPage() {
  const { skills, resources, resourceSkills, projectRequiredSkills, expiringCertifications } =
    useSkillsData();
  const [filterSkill, setFilterSkill] = useState<string>('');

  const skillById = new Map(skills.map((s) => [s.id, s]));
  const matrixLookup = new Map<string, ResourceSkill>();
  for (const rs of resourceSkills) {
    matrixLookup.set(`${rs.resource_id}|${rs.skill_id}`, rs);
  }

  const filteredResources = filterSkill
    ? resources.filter((r) =>
        resourceSkills.some(
          (rs) =>
            rs.resource_id === r.autotask_id &&
            rs.skill_id === filterSkill &&
            (rs.proficiency === 'expert' || rs.proficiency === 'proficient'),
        ),
      )
    : resources;

  return (
    <section>
      <PageHero
        icon={<Sparkles size={20} />}
        title="Skills matrix"
        subtitle="Capability-aware staffing. The right question isn't 'who has time' — it's 'who has time and can do this work.'"
        actions={
          <label className="toolbar-control">
            <span className="muted small">Filter</span>
            <select value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)}>
              <option value="">— any skill —</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        }
      />

      {expiringCertifications.length > 0 && (
        <div className="banner partial">
          <AlertTriangle size={16} />
          <span>
            <strong>{expiringCertifications.length}</strong>{' '}
            certification{expiringCertifications.length === 1 ? '' : 's'} expiring in &lt; 90 days.
            Surfaced for renewal scheduling.
          </span>
        </div>
      )}

      <div className="skill-matrix" style={{ gridTemplateColumns: `200px repeat(${skills.length}, 1fr)` }}>
        <div className="heatmap-corner">Resource</div>
        {skills.map((s) => (
          <div key={s.id} className="heatmap-week-header" title={s.category}>
            {s.name}
          </div>
        ))}
        {filteredResources.map((r) => (
          <RowMatrix
            key={r.autotask_id}
            label={`${r.first_name} ${r.last_name}`}
            initials={`${r.first_name[0]}${r.last_name[0]}`}
            cells={skills.map((s) => matrixLookup.get(`${r.autotask_id}|${s.id}`))}
          />
        ))}
      </div>

      <h2>Project required skills</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Required skills</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(
            projectRequiredSkills.reduce((m, prs) => {
              const arr = m.get(prs.project_id) ?? [];
              arr.push(prs);
              m.set(prs.project_id, arr);
              return m;
            }, new Map<number, typeof projectRequiredSkills>()),
          ).map(([projectId, list]) => (
            <tr key={projectId}>
              <td><code>{projectId}</code></td>
              <td>
                {list.map((prs) => (
                  <span key={prs.skill_id} className="pill pill-running" style={{ marginRight: 4 }}>
                    {skillById.get(prs.skill_id)?.name ?? prs.skill_id}
                    {prs.weight < 1 && <span className="muted small"> · {Math.round(prs.weight * 100)}%</span>}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RowMatrix({
  label,
  initials,
  cells,
}: {
  label: string;
  initials: string;
  cells: (ResourceSkill | undefined)[];
}) {
  return (
    <>
      <div className="heatmap-name">
        <div className="heatmap-name-line">
          <span className="avatar-circle">{initials}</span>
          <span>{label}</span>
        </div>
      </div>
      {cells.map((rs, i) => {
        if (!rs) return <div key={i} className="skill-cell empty" />;
        const tone =
          rs.proficiency === 'expert' ? 'green'
          : rs.proficiency === 'proficient' ? 'yellow'
          : 'orange';
        return (
          <div
            key={i}
            className="skill-cell"
            style={{ background: `var(--util-${tone})` }}
            title={`${rs.proficiency}${rs.certified ? ' · certified' : ''}`}
          >
            <span>{rs.proficiency.charAt(0).toUpperCase()}</span>
            {rs.certified && <span className="cert-mark">✓</span>}
          </div>
        );
      })}
    </>
  );
}
