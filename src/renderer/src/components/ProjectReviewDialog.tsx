import { useMemo, useState } from 'react';
import { FiCheck, FiChevronDown, FiChevronUp, FiList, FiPlay, FiUploadCloud, FiX } from 'react-icons/fi';

import type { ProjectPlay, ProjectPlayRating, TrimoutProject } from '../projectModel';
import { getOrderedSelectedPlays } from '../projectModel';
import { getActionLabel, SCOUT_ACTION_BY_ID } from '../scoutCatalog';
import { getOpeningCandidateIds, getReelLengthGuidance } from '../scoutLogic';

interface Props {
  visible: boolean;
  project: TrimoutProject | null;
  onClose: () => void;
  onToggleSelected: (playId: string, selected: boolean) => void;
  onRatingChange: (playId: string, rating: ProjectPlayRating) => void;
  onMove: (playId: string, direction: -1 | 1) => void;
  onApplyScoutOrder: () => void;
  onContinueInKicko: () => void;
  getFileUrl: (path: string) => string;
}

export default function ProjectReviewDialog({ visible, project, onClose, onToggleSelected, onRatingChange, onMove, onApplyScoutOrder, onContinueInKicko, getFileUrl }: Props) {
  const [filter, setFilter] = useState('all');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [previewPlay, setPreviewPlay] = useState<ProjectPlay | null>(null);

  const actionTypes = useMemo(() => [...new Set(project?.plays.map((play) => play.actionType) ?? [])], [project]);
  const plays = useMemo(() => {
    if (!project) return [];
    return project.plays
      .filter((play) => filter === 'all' || play.actionType === filter)
      .filter((play) => !selectedOnly || play.selected)
      .toSorted((a, b) => a.order - b.order);
  }, [filter, project, selectedOnly]);

  if (!visible || !project) return null;
  const selected = getOrderedSelectedPlays(project);
  const openingCandidateIds = getOpeningCandidateIds(project);
  const selectedDuration = selected.reduce((total, play) => total + (play.duration ?? 0), 0);
  const lengthGuidance = getReelLengthGuidance(selectedDuration);

  return (
    <div className="kicko-dialog-backdrop" role="presentation">
      <section className="kicko-dialog project-review-dialog" role="dialog" aria-modal="true" aria-labelledby="project-review-title">
        <header className="kicko-dialog-header review-header">
          <div>
            <div className="kicko-kicker">{project.name}</div>
            <h2 id="project-review-title">Choose the plays that tell the story</h2>
            <p>{project.plays.length} collected · {selected.length} selected</p>
          </div>
          <button type="button" className="icon-button" title="Close" aria-label="Close" onClick={onClose}><FiX /></button>
        </header>

        <div className="review-toolbar">
          <select aria-label="Filter by action" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All actions</option>
            {actionTypes.map((actionType) => <option value={actionType} key={actionType}>{getActionLabel(actionType)}</option>)}
          </select>
          <label className="checkbox-control" htmlFor="project-selected-only"><input id="project-selected-only" type="checkbox" checked={selectedOnly} onChange={(event) => setSelectedOnly(event.target.checked)} /> Selected only</label>
          {project.scoutRole && <button type="button" className="secondary-button compact scout-order-button" onClick={onApplyScoutOrder}><FiList /> Use Scout order</button>}
          <span className={`review-length-guidance ${lengthGuidance.tone}`}>
            <strong>{lengthGuidance.durationLabel} selected</strong>
            <small>{lengthGuidance.message}</small>
          </span>
        </div>

        <div className="project-review-content">
          <div className="review-play-list consistent-scrollbar">
            {plays.length === 0 && <div className="review-empty">No plays match this filter.</div>}
            {plays.map((play, index) => {
              const action = SCOUT_ACTION_BY_ID.get(play.actionType);
              return (
                <article className={`review-play ${play.selected ? 'selected' : ''}`} key={play.id}>
                  <button type="button" className="review-preview" title={`Preview ${play.fileName}`} onClick={() => setPreviewPlay(play)}><FiPlay /></button>
                  <div className="review-play-copy">
                    <div className="review-play-title">
                      <span style={{ color: action?.color }}>{play.actionLabel || getActionLabel(play.actionType)}</span>
                      {openingCandidateIds.has(play.id) && <b className="opening-candidate-tag">OPENING ~30S</b>}
                      <small>{play.sourceName}</small>
                    </div>
                    <div className="review-play-meta">{play.duration == null ? 'Duration unavailable' : `${play.duration.toFixed(1)} sec`}</div>
                  </div>
                  <select aria-label={`Rating for ${play.fileName}`} value={play.rating} onChange={(event) => onRatingChange(play.id, event.target.value as ProjectPlayRating)}>
                    <option value="normal">Normal</option>
                    <option value="good">Good</option>
                    <option value="strong">Strong</option>
                    <option value="must_include">Must include</option>
                  </select>
                  <button type="button" className={`select-play-button ${play.selected ? 'selected' : ''}`} aria-pressed={play.selected} onClick={() => onToggleSelected(play.id, !play.selected)}>{play.selected && <FiCheck />} {play.selected ? 'Selected' : 'Select'}</button>
                  <div className="order-buttons" aria-label={`Reorder ${play.fileName}`}>
                    <button type="button" className="icon-button subtle" disabled={index === 0} title="Move up" aria-label="Move up" onClick={() => onMove(play.id, -1)}><FiChevronUp /></button>
                    <button type="button" className="icon-button subtle" disabled={index === plays.length - 1} title="Move down" aria-label="Move down" onClick={() => onMove(play.id, 1)}><FiChevronDown /></button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="review-preview-panel">
            {previewPlay ? (
              <>
                {/* Exported match clips do not have a captions source. */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video key={previewPlay.filePath} controls autoPlay src={getFileUrl(previewPlay.filePath)} />
                <strong>{previewPlay.actionLabel || getActionLabel(previewPlay.actionType)}</strong>
                <span>{previewPlay.sourceName}</span>
              </>
            ) : (
              <div className="preview-placeholder"><FiPlay /><span>Choose a play to preview it</span></div>
            )}
          </aside>
        </div>

        <footer className="kicko-dialog-footer review-footer">
          <span>{selected.length === 0 ? 'Select at least one play to continue.' : `${selected.length} plays ready for KICKO`}</span>
          <button type="button" className="primary-button" disabled={selected.length === 0} onClick={onContinueInKicko}><FiUploadCloud /> Continue in KICKO</button>
        </footer>
      </section>
    </div>
  );
}
