import type { RemoteRpcApi } from '../main/index.ts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ipcRenderer } = require('electron');

const apiProxy = new Proxy(
  {} as RemoteRpcApi,
  {
    get(_target, method: keyof RemoteRpcApi) {
      return (...args: unknown[]) => (
        ipcRenderer.invoke('__electron_rpc__', method, args)
      );
    },
  },
);

// @ts-expect-error the inherited renderer still runs in the main world
window.electron = apiProxy;
