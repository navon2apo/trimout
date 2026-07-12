import { useState } from 'react';
import { FiX } from 'react-icons/fi';

import type { ScoutRoleId } from '../projectModel';
import { SCOUT_ROLES } from '../scoutCatalog';

interface Props {
  visible: boolean;
  defaultPlayerName: string;
  onCancel: () => void;
  onCreate: (value: { name: string; playerName: string; scoutRole: ScoutRoleId | null }) => void;
}

function ProjectSetupForm({ defaultPlayerName, onCancel, onCreate }: Omit<Props, 'visible'>) {
  const [name, setName] = useState('');
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [scoutRole, setScoutRole] = useState<ScoutRoleId | ''>('');

  return (
    <div className="kicko-dialog-backdrop" role="presentation">
      <section className="kicko-dialog project-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="project-setup-title">
        <header className="kicko-dialog-header">
          <div>
            <div className="kicko-kicker">KICKO TRIMOUT</div>
            <h2 id="project-setup-title">Keep plays from multiple games</h2>
          </div>
          <button type="button" className="icon-button" title="Close" aria-label="Close" onClick={onCancel}><FiX /></button>
        </header>
        <div className="kicko-dialog-body form-stack">
          <label htmlFor="project-name">
            <span>Project name</span>
            <input id="project-name" value={name} maxLength={80} placeholder="Example: Alex - 2026 season" onChange={(event) => setName(event.target.value)} />
          </label>
          <label htmlFor="project-player-name">
            <span>Player name</span>
            <input id="project-player-name" value={playerName} maxLength={60} placeholder="Player name" onChange={(event) => setPlayerName(event.target.value)} />
          </label>
          <label htmlFor="project-scout-role">
            <span>Position <small>Optional</small></span>
            <select id="project-scout-role" value={scoutRole} onChange={(event) => setScoutRole(event.target.value as ScoutRoleId | '')}>
              <option value="">No Scout recommendations</option>
              {SCOUT_ROLES.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
            </select>
          </label>
          <p className="form-note">Your original game videos stay on this computer. Only rendered plays are collected in the project.</p>
        </div>
        <footer className="kicko-dialog-footer">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary-button" disabled={!name.trim()} onClick={() => onCreate({ name, playerName, scoutRole: scoutRole || null })}>Create project</button>
        </footer>
      </section>
    </div>
  );
}

export default function ProjectSetupDialog({ visible, defaultPlayerName, onCancel, onCreate }: Props) {
  if (!visible) return null;
  return <ProjectSetupForm defaultPlayerName={defaultPlayerName} onCancel={onCancel} onCreate={onCreate} />;
}
