import { test } from '@playwright/test';
import { searchProducts } from '../helpers/flows';

test('Scenario 2: Search Products — search and verify results', async ({ page }) => {
  await searchProducts(page);
});
