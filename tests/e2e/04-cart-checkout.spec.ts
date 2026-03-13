import { test } from '@playwright/test';
import { cartAndCheckout } from '../helpers/flows';

test('Scenario 4: Add to Cart & Checkout — full purchase flow', async ({ page }) => {
  await cartAndCheckout(page);
});
