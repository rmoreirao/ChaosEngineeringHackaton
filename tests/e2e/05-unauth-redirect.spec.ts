import { test } from '@playwright/test';
import { unauthRedirect } from '../helpers/flows';

test('Scenario 5: Unauthenticated Redirect — protected pages require login', async ({ page }) => {
  await unauthRedirect(page);
});
