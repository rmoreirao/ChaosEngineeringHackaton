import { test } from '@playwright/test';
import { registerAndLogin } from '../helpers/flows';

test('Scenario 3: Register & Login — register, logout, login', async ({ page }) => {
  await registerAndLogin(page);
});
