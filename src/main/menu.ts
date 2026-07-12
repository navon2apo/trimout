import type { BrowserWindow, MenuItem, MenuItemConstructorOptions } from 'electron';
// eslint-disable-next-line import/no-extraneous-dependencies
import electron from 'electron';
import { t } from 'i18next';

import { homepageUrl, getReleaseUrl, licensesUrl, thanksUrl, usageUrl, faqUrl, troubleshootingUrl, featureRequestUrl } from '../common/constants.js';
import { logFilePath } from './logger.js';
import { getConfigPath } from './configStore.js';


// menu-safe i18n.t:
// https://github.com/mifi/lossless-cut/issues/1456
const esc = (val: string) => val.replaceAll('&', '&&');

const { Menu } = electron;

export default ({ app, mainWindow, newVersion, isStoreBuild }: {
  app: Electron.App, mainWindow: BrowserWindow, newVersion?: string | undefined, isStoreBuild: boolean,
}) => {
  // todo TS mainWindow.webContents.send
  const menu: (MenuItemConstructorOptions | MenuItem)[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),

    {
      label: esc(t('File')),
      submenu: [
        {
          label: esc(t('Open')),
          accelerator: 'CmdOrCtrl+O',
          async click() {
            mainWindow.webContents.send('openFilesDialog');
          },
        },
        { type: 'separator' },
        {
          label: esc(t('Close')),
          accelerator: 'CmdOrCtrl+W',
          async click() {
            mainWindow.webContents.send('closeCurrentFile');
          },
        },
        { type: 'separator' },
        {
          label: esc(t('Save clip list (CSV)')),
          click() {
            mainWindow.webContents.send('exportEdlFile', 'csv-human');
          },
        },
        {
          label: esc(t('Load clip list (CSV)')),
          click() {
            mainWindow.webContents.send('importEdlFile', 'csv');
          },
        },
        { type: 'separator' },
        {
          label: esc(t('Settings')),
          accelerator: 'CmdOrCtrl+,',
          click() {
            mainWindow.webContents.send('toggleSettings');
          },
        },
        // Due to Apple Review Guidelines, we cannot include an Exit menu item here
        // Apple has their own Quit from the app menu
        ...(process.platform !== 'darwin' ? [
          { type: 'separator' } as const,
          {
            label: esc(t('Exit')),
            click() {
              app.quit();
            },
          },
        ] : []),
      ],
    },

    {
      label: esc(t('Edit')),
      submenu: [
        // https://github.com/mifi/lossless-cut/issues/610
        // https://github.com/mifi/lossless-cut/issues/1183
        { role: 'undo', label: esc(t('Undo')) },
        { role: 'redo', label: esc(t('Redo')) },
        { type: 'separator' },
        { role: 'cut', label: esc(t('Cut')) },
        { role: 'copy', label: esc(t('Copy')) },
        { role: 'paste', label: esc(t('Paste')) },
        { role: 'selectAll', label: esc(t('Select All')) },
      ],
    },

    {
      label: esc(t('Segments')),
      submenu: [
        {
          label: esc(t('Create num segments')),
          click() {
            mainWindow.webContents.send('createNumSegments');
          },
        },
        {
          label: esc(t('Create fixed duration segments')),
          click() {
            mainWindow.webContents.send('createFixedDurationSegments');
          },
        },
        {
          label: esc(t('Create byte sized segments')),
          click() {
            mainWindow.webContents.send('createFixedByteSizedSegments');
          },
        },
        {
          label: esc(t('Create random segments')),
          click() {
            mainWindow.webContents.send('createRandomSegments');
          },
        },

        { type: 'separator' },

        {
          label: esc(t('Reorder segments by start time')),
          click() {
            mainWindow.webContents.send('reorderSegsByStartTime');
          },
        },
        {
          label: esc(t('Shuffle segments order')),
          click() {
            mainWindow.webContents.send('shuffleSegments');
          },
        },

        { type: 'separator' },

        {
          label: esc(t('Combine overlapping segments')),
          click() {
            mainWindow.webContents.send('combineOverlappingSegments');
          },
        },
        {
          label: esc(t('Combine selected segments')),
          click() {
            mainWindow.webContents.send('combineSelectedSegments');
          },
        },
        {
          label: esc(t('Split segment at cursor')),
          click() {
            mainWindow.webContents.send('splitCurrentSegment');
          },
        },
        {
          label: esc(t('Invert all segments on timeline')),
          click() {
            mainWindow.webContents.send('invertAllSegments');
          },
        },
        {
          label: esc(t('Fill gaps between segments')),
          click() {
            mainWindow.webContents.send('fillSegmentsGaps');
          },
        },

        { type: 'separator' },

        {
          label: esc(t('Shift all segments on timeline')),
          click() {
            mainWindow.webContents.send('shiftAllSegmentTimes');
          },
        },
        {
          label: esc(t('Align segment times to keyframes')),
          click() {
            mainWindow.webContents.send('alignSegmentTimesToKeyframes');
          },
        },

        { type: 'separator' },

        {
          label: esc(t('Clear all segments')),
          click() {
            mainWindow.webContents.send('clearSegments');
          },
        },
      ],
    },

    {
      label: esc(t('View')),
      submenu: [
        ...(process.platform === 'win32' ? [
          { role: 'minimize' as const, label: esc(t('Minimize')) },
          { role: 'zoom' as const, label: esc(t('Maximize')) },
        ] : []),
        { role: 'togglefullscreen', label: esc(t('Toggle Full Screen')) },
        { role: 'resetZoom', label: esc(t('Reset font size')) },
        { role: 'zoomIn', label: esc(t('Increase font size')) },
        { role: 'zoomOut', label: esc(t('Decrease font size')) },
      ],
    },

    // On Windows the windowMenu has a close Ctrl+W which clashes with File->Close shortcut
    // Also, Windows apps don't normally have a Window menu.
    // https://github.com/mifi/lossless-cut/discussions/2409
    ...(process.platform === 'darwin' ? [{ role: 'windowMenu' as const, label: esc(t('Window')) }] : []),

    {
      role: 'help',
      label: esc(t('Help')),
      submenu: [
        {
          label: esc(t('Keyboard & mouse shortcuts')),
          click() {
            mainWindow.webContents.send('toggleKeyboardShortcuts');
          },
        },
        { type: 'separator' },
        {
          label: esc(t('Configuration file')),
          click() { electron.shell.showItemInFolder(getConfigPath()); },
        },
        {
          label: esc(t('Log file')),
          click() { electron.shell.openPath(logFilePath); },
        },
        { type: 'separator' },
        {
          label: esc(t('Licenses (GPL)')),
          click() { electron.shell.openExternal(licensesUrl); },
        },
        ...(process.platform !== 'darwin' ? [{ role: 'about' as const, label: esc(t('About KICKO TrimOut')) }] : []),
      ],
    },
  ];

  if (!isStoreBuild && newVersion) {
    menu.push({
      label: esc(t('New version!')),
      submenu: [
        {
          label: esc(t('Download {{version}}', { version: newVersion })),
          click() { electron.shell.openExternal(getReleaseUrl(newVersion)); },
        },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
};
