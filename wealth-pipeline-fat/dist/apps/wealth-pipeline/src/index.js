// apps/wealth-pipeline/src/index.ts
// File 1 of 1
// One-line rationale: Fixing type errors by safely exposing dependencies and handling undefined arguments.
import 'dotenv/config';
import { getCognitiClient } from '@cogniti/client-provider';
import { PipelineOrchestrator } from './orchestrator.js';
import path from 'node:path';
let initializedOrchestrator = null;
async function getInitializedOrchestrator() {
    if (initializedOrchestrator)
        return initializedOrchestrator;
    const client = await getCognitiClient();
    const baseDeps = await client.getDependencies('headlines-system');
    const dependencies = {
        ...baseDeps,
        userId: 'headlines-system',
        statusCallback: () => { },
        streamCallback: () => { },
        updateUserPersona: async () => { },
    };
    const instance = new PipelineOrchestrator(dependencies);
    initializedOrchestrator = { instance, dependencies };
    return initializedOrchestrator;
}
export const orchestrator = {
    run: async (dependencies, params) => {
        const { instance } = await getInitializedOrchestrator();
        return instance.run(dependencies, params);
    },
};
async function main() {
    const { instance, dependencies } = await getInitializedOrchestrator();
    await instance.run(dependencies);
}
// This logic ensures `main()` only runs when the script is executed directly
const entryPoint = process.argv[1];
if (entryPoint) {
    try {
        const currentFileUrl = import.meta.url;
        const processFileUrl = path.resolve(process.cwd(), entryPoint);
        // A more robust check might be needed depending on how tsx/node resolve paths
        if (currentFileUrl.endsWith(path.basename(processFileUrl)) ||
            processFileUrl.endsWith('dist/index.js')) {
            main().catch(console.error);
        }
    }
    catch (e) {
        // Fallback for different execution environments
        main().catch(console.error);
    }
}
//# sourceMappingURL=index.js.map