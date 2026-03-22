import { type Page, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// --- Scenario 1: Browse Products ---
export async function browseProducts(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welkom bij Oranje Markt' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured Products' })).toBeVisible();

  const productCards = page.locator('h3').filter({ hasText: /\w/ });
  const featuredSection = page.locator('text=Featured Products').locator('..');
  await expect(page.getByRole('heading', { name: 'Browse by Category' })).toBeVisible();

  // Navigate to a category
  await page.getByRole('link', { name: 'Kaas & Zuivel' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kaas & Zuivel' })).toBeVisible();

  // Navigate to a product
  await page.getByRole('link', { name: 'Gouda Jong' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Gouda Jong' })).toBeVisible();
  await expect(page.getByText('€4.99')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to Cart', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Related Products' })).toBeVisible();
}

// --- Scenario 2: Search Products ---
export async function searchProducts(page: Page) {
  await page.goto('/');
  const searchBox = page.getByPlaceholder('Zoeken...');
  await searchBox.fill('stroopwafels');
  await searchBox.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=stroopwafels/);
  await expect(page.getByRole('heading', { name: 'Search Results' })).toBeVisible();
  await expect(page.getByText('results for "stroopwafels"')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Stroopwafels' })).toBeVisible();
  await expect(page.getByText('€2.99')).toBeVisible();
}

// --- Scenario 3: Register & Login ---
export async function registerAndLogin(page: Page) {
  const email = `testuser-${Date.now()}@example.com`;
  const password = 'Test1234';

  // Register
  await page.goto('/auth/register');
  await page.getByPlaceholder('Jan de Vries').fill('Test User');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Min. 6 characters').fill(password);
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page).toHaveURL('/', { timeout: 10000 });
  await expect(page.getByText('Logout')).toBeVisible();

  // Logout
  await page.getByText('Logout').click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();

  // Login
  await page.goto('/auth/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL('/', { timeout: 10000 });
  await expect(page.getByText('Logout')).toBeVisible();

  return email;
}

// --- Scenario 4: Add to Cart & Checkout ---
export async function cartAndCheckout(page: Page) {
  // Ensure logged in first
  const email = await registerAndLogin(page);

  // Add Gouda Jong (qty 2)
  await page.goto('/products/gouda-jong', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: '+', exact: true }).first().click();
  await page.getByRole('button', { name: 'Add to Cart', exact: true }).click();

  // Add Stroopwafels (qty 1)
  await page.goto('/products/stroopwafels', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Add to Cart', exact: true }).click();

  // Go to cart
  await page.goto('/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gouda Jong' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Stroopwafels' })).toBeVisible();

  // Proceed to checkout
  await page.getByRole('link', { name: 'Proceed to Checkout' }).click();
  await expect(page.getByRole('heading', { name: /Checkout/i })).toBeVisible({ timeout: 15000 });

  // Fill address and place order
  await page.getByPlaceholder('Street, City, Postal Code, Country').fill('Keizersgracht 123, Amsterdam, 1015 CJ, Netherlands');
  await page.getByRole('button', { name: /Place Order/i }).click();

  // Verify redirect to orders
  await expect(page).toHaveURL(/\/orders/, { timeout: 15000 });
  await expect(page.getByText('COMPLETED').first()).toBeVisible({ timeout: 15000 });

  // Verify cart is empty
  await page.goto('/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect(page.getByRole('heading', { name: /cart is empty/i })).toBeVisible();
}

// --- Scenario 5: Unauthenticated Checkout Redirect ---
export async function unauthRedirect(page: Page) {
  // Clear auth state
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('oranje-auth-token');
    localStorage.removeItem('oranje-cart');
  });
  await page.reload();

  // Check checkout redirect
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Login Required' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login to Continue' })).toBeVisible();

  // Check orders redirect — redirects to login page
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/auth\/login\?callbackUrl/, { timeout: 10000 });
}
