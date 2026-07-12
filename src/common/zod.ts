import * as schemas from '../../node_modules/zod/v4/classic/schemas.js';
import { ZodError } from '../../node_modules/zod/v4/classic/errors.js';
import { config } from '../../node_modules/zod/v4/core/index.js';
import en from '../../node_modules/zod/v4/locales/en.js';
import type { infer as Infer } from '../../node_modules/zod/v4/core/index.js';

config(en());

export const z = schemas;

export namespace z {
  export type infer<T> = Infer<T>;
}

export { ZodError };
export default z;
