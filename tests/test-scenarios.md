# Oranje Markt — E2E Test Scenarios

> These scenarios validate the main user paths and are designed to also serve as **load test flows**.  
> **Frontend**: http://localhost:3000 | **Backend API**: http://localhost:4000

---

## Scenario 1: Browse Products

> Guest user browses the catalog.

1. Open homepage `/`
2. Verify hero banner heading "Welkom bij Oranje Markt" is visible
3. Verify 8 featured product cards are displayed (each with name, price, "Add to cart" button)
4. Verify 5 category cards are displayed under "Browse by Category"
5. Click category "Kaas & Zuivel" → page `/categories/kaas-zuivel` loads with 5 products
6. Click product "Gouda Jong" → page `/products/gouda-jong` loads with name, price (€4.99), description, "Add to Cart" button, and "Related Products" section (4 items)

---

## Scenario 2: Search Products

> Guest user searches for a product.

1. On homepage, type "stroopwafels" in the search box ("Zoeken...") and press Enter
2. Page navigates to `/search?q=stroopwafels`
3. Verify heading "Search Results" and text `1 results for "stroopwafels"`
4. Verify "Stroopwafels" product card is displayed with price €2.99

---

## Scenario 3: Register & Login

> New user registers, logs out, then logs back in.

1. Navigate to `/auth/register`
2. Fill in: Name = "Test User", Email = `testuser-{timestamp}@example.com`, Password = "Test1234"
3. Click "Register" → redirected to homepage `/`
4. Verify navbar shows "Logout" (not "Login")
5. Click "Logout" → navbar shows "Login" again
6. Navigate to `/auth/login`
7. Fill in: Email = (same as step 2), Password = "Test1234"
8. Click "Login" → redirected to homepage `/`
9. Verify navbar shows "Logout"

---

## Scenario 4: Add to Cart & Checkout

> Authenticated user adds products, checks out, and verifies the order.

**Prerequisites**: User is logged in (from Scenario 3).

1. Navigate to `/products/gouda-jong`
2. Click "+" to set quantity to 2, then click "Add to Cart"
3. Verify cart badge shows "2"
4. Navigate to `/products/stroopwafels`
5. Click "Add to Cart" (qty 1)
6. Verify cart badge shows "3"
7. Navigate to `/cart`
8. Verify 2 line items: "Gouda Jong" (qty 2, €9.98) and "Stroopwafels" (qty 1, €2.99)
9. Verify order summary total is €12.97
10. Click "Proceed to Checkout" → page `/checkout` loads
11. Enter address "Keizersgracht 123, Amsterdam, NL"
12. Click "Place Order" → redirected to `/orders` with success indicator
13. Verify the order appears with status "COMPLETED", correct items and total
14. Navigate to `/cart` → verify cart is empty ("Your cart is empty")

---

## Scenario 5: Unauthenticated Checkout Redirect

> Guest user tries to access protected pages.

1. Ensure user is NOT logged in (clear `localStorage` keys `oranje-auth-token` and `oranje-cart`)
2. Navigate to `/checkout` → page shows "Login Required" with link to `/auth/login?callbackUrl=/checkout`
3. Navigate to `/orders` → page shows "Login Required" with link to `/auth/login?callbackUrl=/orders`

---

## Load Testing Notes

- **Scenario 1 + 2** are read-only and safe to run at high concurrency without side effects.
- **Scenario 3** creates users — use unique emails per virtual user (e.g. append UUID).
- **Scenario 4** creates orders — represents the full purchase funnel. Use to measure end-to-end latency under load.
- **Scenario 5** is lightweight — useful for validating auth middleware performance.
- Recommended load mix: **60% browsing (S1+S2)**, **10% registration (S3)**, **25% purchase (S4)**, **5% auth redirect (S5)**.
