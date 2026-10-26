import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Builds the Pagefind search index once the static site is written, so search
 * works however the build is started (`pnpm build`, `astro build`, CI).
 * Pagefind is fetched with npx on demand; it is not a project dependency.
 * Set PAGEFIND_SKIP=1 to skip indexing.
 * @returns {import('astro').AstroIntegration} Astro integration
 */
export function pagefind() {
  return {
    name: 'pianpker-pagefind',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        if (process.env.PAGEFIND_SKIP === '1') {
          logger.info('PAGEFIND_SKIP=1, search index skipped')
          return
        }
        const site = fileURLToPath(dir)
        try {
          execFileSync('npx', ['-y', 'pagefind@^1', '--site', site], { stdio: 'inherit' })
        }
        catch (error) {
          // Search is an enhancement: never fail the whole build over it.
          logger.warn(`Pagefind indexing failed, search will be empty: ${String(error)}`)
        }
      },
    },
  }
}
