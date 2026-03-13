import { test } from '@playwright/test';
import { browseProducts } from '../helpers/flows';

test('Scenario 1: Browse Products — homepage → category → product detail', async ({ page }) => {
  await browseProducts(page);
});
