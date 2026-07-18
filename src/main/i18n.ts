import i18n from 'i18next';
import Backend from 'i18next-fs-backend';

import { commonI18nOptions, loadPath, addPath, fallbackLng } from './i18nCommon.js';

// See also renderer

// https://github.com/i18next/i18next/issues/869
export default await i18n
  .use(Backend)
  .use({ type: 'languageDetector', async: false, detect: () => fallbackLng })
  // See also i18next.config.base.ts
  .init({
    ...commonI18nOptions,

    backend: {
      loadPath,
      addPath,
    },
  });
