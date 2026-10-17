import fs from 'node:fs';
import path from 'node:path';
import { defineNuxtModule, resolvePath } from '@nuxt/kit';
import { extractKeys } from '@arkenv/nuxt/config';

/**
 * `@arkenv/nuxt` registers every server-only key in `runtimeConfig` as `''`
 * for production builds, expecting `NUXT_`-prefixed overrides at runtime.
 * Those empty placeholders would shadow the real (unprefixed) environment
 * variables during validation, so drop them and let ArkEnv read
 * `process.env` at Nitro boot. `NUXT_*` overrides keep working.
 *
 * It also passes the validation engine to Nitro's file tracer as a resolved
 * file path (the module adds the bare package name, which the tracer rejects).
 */
export default defineNuxtModule({
  meta: { name: 'arkenv-process-env' },
  async setup(_options, nuxt) {
    const enginePath = await resolvePath('@arkenv/core');
    nuxt.hook('nitro:config', (config) => {
      const traceInclude = config.externals?.traceInclude;
      if (!traceInclude) return;
      config.externals!.traceInclude = traceInclude.map((entry) =>
        entry === '@arkenv/core' ? enginePath : entry
      );
    });

    nuxt.hook('modules:done', () => {
      const schema = fs.readFileSync(
        path.join(nuxt.options.rootDir, 'env.ts'),
        'utf-8'
      );
      const { serverKeys } = extractKeys(schema);
      const runtimeConfig = nuxt.options.runtimeConfig as Record<
        string,
        unknown
      >;
      for (const key of serverKeys) {
        if (runtimeConfig[key] === '') delete runtimeConfig[key];
      }
    });
  },
});
