import { FiFolder, FiFolderPlus, FiGrid, FiPlus, FiX } from 'react-icons/fi';

import type { TrimoutProject } from '../projectModel';
import { getProjectActionCounts } from '../projectModel';
import { SCOUT_ROLE_BY_ID, getActionLabel } from '../scoutCatalog';

interface Props {
  project: TrimoutProject | null;
  canAddAnotherVideo: boolean;
  onNewProject: () => void;
  onOpenProject: () => void;
  onReview: () => void;
  onAddAnotherVideo: () => void;
  onCloseProject: () => void;
}

export default function ProjectWorkspace({ project, canAddAnotherVideo, onNewProject, onOpenProject, onReview, onAddAnotherVideo, onCloseProject }: Props) {
  if (!project) {
    return (
      <section className="project-workspace project-workspace-empty" aria-label="Projects">
        <div>
          <div className="kicko-kicker">MULTI-GAME PROJECT</div>
          <div className="project-workspace-title">Keep plays across games</div>
        </div>
        <div className="project-workspace-actions">
          <button type="button" className="primary-button compact" onClick={onNewProject}><FiFolderPlus /> New project</button>
          <button type="button" className="secondary-button compact" onClick={onOpenProject}><FiFolder /> Open</button>
        </div>
      </section>
    );
  }

  const counts = getProjectActionCounts(project);
  const role = project.scoutRole ? SCOUT_ROLE_BY_ID.get(project.scoutRole) : null;
  const recommendations = role?.recommended.slice(0, 4) ?? [];

  return (
    <section className="project-workspace" aria-label={`Project ${project.name}`}>
      <div className="project-workspace-head">
        <div className="project-workspace-copy">
          <div className="kicko-kicker">ACTIVE PROJECT</div>
          <div className="project-workspace-title" title={project.name}>{project.name}</div>
          <div className="project-workspace-meta">{project.plays.length} plays from {project.batches.length} game{project.batches.length === 1 ? '' : 's'}{role ? ` · ${role.shortLabel}` : ''}</div>
        </div>
        <button type="button" className="icon-button subtle" title="Close project" aria-label="Close project" onClick={onCloseProject}><FiX /></button>
      </div>

      {recommendations.length > 0 && (
        <div className="scout-progress" aria-label="Scout recommendations">
          {recommendations.map(({ actionType, target }) => {
            const count = counts[actionType] ?? 0;
            return (
              <div className="scout-progress-row" key={actionType}>
                <span>{getActionLabel(actionType)}</span>
                <strong className={count >= target ? 'complete' : undefined}>{count}/{target}</strong>
              </div>
            );
          })}
        </div>
      )}

      <div className="project-workspace-actions">
        <button type="button" className="primary-button compact" onClick={onReview}><FiGrid /> Review plays</button>
        <button type="button" className="secondary-button compact" disabled={!canAddAnotherVideo} title={canAddAnotherVideo ? 'Open another game video' : 'Export the current plays first'} onClick={onAddAnotherVideo}><FiPlus /> Add video</button>
      </div>
    </section>
  );
}
