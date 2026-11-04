/* eslint-disable import/no-relative-packages, import/export, @typescript-eslint/no-namespace --
   Deliberate: zod's package entry also pulls in every non-English locale. TrimOut is English-only,
   so we import the classic schemas directly and register only the English messages. */
import * as schemas from '../../node_modules/zod/v4/classic/schemas.js';
import { config } from '../../node_modules/zod/v4/core/index.js';
import en from '../../node_modules/zod/v4/locales/en.js';
import type { infer as Infer } from '../../node_modules/zod/v4/core/index.js';

config(en());

export const z = schemas;

export namespace z {
  export type infer<T> = Infer<T>;
  export type ZodType<Output = unknown> = schemas.ZodType<Output>;
}

export { ZodError } from '../../node_modules/zod/v4/classic/errors.js';
export default z;
