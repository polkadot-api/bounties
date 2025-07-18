import { inject, isMimirReady, MIMIR_REGEXP } from '@mimirdev/apps-inject';

// Initialize Mimir SDK injection to window object
export async function initializeMimir(): Promise<void> {
  const origin = await isMimirReady();

  if (!origin) {
    // Not opened in Mimir
    return;
  }

  // Verify if the URL matches Mimir's pattern
  if (MIMIR_REGEXP.test(origin)) {
    // Inject Mimir into window.injectedWeb3
    inject();
  }
}