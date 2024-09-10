import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import path from 'node:path'
import tsconfig from "./tsconfig.json";
import { config } from "dotenv";

// Create an alias object from the paths in tsconfig.json
const alias = Object.fromEntries(
  // For Each Path in tsconfig.json
  Object.entries(tsconfig.compilerOptions.paths).map(([key, [value]]) => [
      // Remove the "/*" from the key and resolve the path
      key.replace("/*", ""),
      // Remove the "/*" from the value Resolve the relative path
      path.resolve(__dirname, value.replace("/*", ""))
  ])
);

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: 'wrangler.test.toml' }, // todo: might need to change this for test
        isolatedStorage: true,
        singleWorker: true
      }
    },
    env: {
      ...config({ path: ".env.test" }).parsed,
    },
  },
  resolve: {
    alias
  }
})
