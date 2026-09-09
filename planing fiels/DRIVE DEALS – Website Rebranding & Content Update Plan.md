# DRIVE DEALS – Website Rebranding & Content Update Plan

## Project Context

The website is already fully built, deployed on Netlify, and working correctly.

The current website uses placeholder/demo data.

The website is for selling and preparing game data.

The customer should be able to:

- Browse available games.
- Select one or multiple games.
- See the size of each game.
- See the total estimated storage size of all selected games.
- Enter their customer/order information.
- Review the order before submitting.
- Submit the order.
- Send the final order information to my Telegram bot.

IMPORTANT:

Do NOT rebuild the project from scratch.

Do NOT change the current working logic unless required.

Do NOT break the game selection system, size calculation, order form, confirmation page, or Telegram integration.

The goal of this phase is mainly to change the website identity, branding, colors, wording, and content.

---

# Phase 1 – Change Project Branding

Change the project name everywhere to:

**DRIVE DEALS**

Remove any old project name, placeholder brand, or demo brand from:

- Page titles
- Navigation bar
- Headers
- Footer
- Browser tab title
- Metadata
- Buttons or text containing the old brand

Use **DRIVE DEALS** consistently across the website.

---

# Phase 2 – Add the Logo

I will provide a logo file inside the project files.

Find the provided logo file and use it as the official DRIVE DEALS logo.

Add the logo in appropriate places such as:

- Website header / navbar
- Main landing section if appropriate
- Footer if appropriate

The logo must be responsive and must not appear stretched or distorted.

Do not redesign or modify the logo itself.

---

# Phase 3 – Change the Visual Identity

Redesign the current color identity to look modern and technology-focused.

Main color direction:

- Dark blue
- Medium blue
- Cyan
- Light cyan
- White
- Very dark navy backgrounds where appropriate

The website should feel related to:

- Technology
- Gaming
- Digital storage
- Game libraries
- Hard drives / SSDs
- Data transfer

Avoid unrelated colors unless needed for statuses such as errors or success messages.

Use blue and cyan as the primary accent colors.

Suggested style:

- Modern
- Clean
- Dark-tech appearance
- Gaming-inspired but professional
- Soft glowing blue/cyan accents
- Clear cards
- Good contrast
- Smooth hover effects

Do not make the design overly complicated.

Performance and usability are more important than excessive animations.

---

# Phase 4 – Update Website Text

Replace generic/demo wording with wording appropriate for a game data ordering service.

The customer is selecting games that they want to receive as game data.

Use clear customer-friendly wording.

Examples of suitable terminology:

Instead of:

"Products"

Use:

"Games"

Instead of:

"Add to Cart"

Prefer wording such as:

"Add Game"
or
"Select Game"

Instead of:

"Shopping Cart"

Prefer:

"Selected Games"

Instead of:

"Total Price"

If the website is currently mainly calculating storage rather than money, use:

"Total Size"
or
"Estimated Storage Required"

For example:

**Game Size: 85 GB**

**Selected Games: 6**

**Estimated Total Size: 420 GB**

---

# Phase 5 – Main Page Content

Update the main page so visitors immediately understand the service.

Suggested main heading:

**Your Games. Your Drive. Ready to Go.**

Suggested supporting text:

**Choose the games you want, check the required storage space, and send your order directly to DRIVE DEALS.**

Possible CTA button:

**Browse Games**

Another suitable section title:

**Choose Your Games**

Supporting text:

**Browse the available game library and select the titles you want. The required storage space will be calculated automatically.**

---

# Phase 6 – Game Cards

Each game card should clearly show:

- Game image
- Game name
- Game size
- Selection button/status

Example:

Game Name

**Size: 75 GB**

Button:

**Select Game**

After selection, it can change to:

**Selected**

Make the size visually easy to notice.

Do not change how game selection works internally unless necessary.

---

# Phase 7 – Selected Games / Storage Summary

The selected games area should clearly show the current order.

Suggested labels:

**Selected Games**

**Total Games**

**Estimated Storage Required**

Example:

Selected Games: 8

Estimated Storage Required: 684 GB

If the total exceeds 1000 GB, displaying TB where appropriate is acceptable.

Example:

**Estimated Storage Required: 1.24 TB**

Do not introduce calculation errors when changing the display.

---

# Phase 8 – Customer Information Page

Change the form wording so it matches the DRIVE DEALS service.

Use clear labels such as:

**Customer Information**

Possible fields should keep the existing logic but use suitable labels.

For example:

- Name
- Phone Number
- Address
- Notes

For the notes field, use something like:

**Additional Notes**

Placeholder example:

**Any special requests or notes about your order...**

Do not remove existing required fields.

---

# Phase 9 – Order Confirmation Page

Make the confirmation page look like a final game data order summary.

Suggested title:

**Review Your Order**

Show clearly:

- Customer information
- Selected games
- Size of each game
- Number of selected games
- Estimated total storage required

Suggested final button:

**Confirm & Send Order**

After successful submission, show a suitable success message.

Example:

**Order Sent Successfully**

Supporting message:

**Your DRIVE DEALS order has been sent successfully. We will contact you to confirm the details.**

---

# Phase 10 – Telegram Order Message

Keep the existing Telegram bot integration working.

Do NOT expose or modify the Telegram bot token unnecessarily.

Improve the Telegram message formatting so the received order is easy to read.

Suggested format:

DRIVE DEALS - NEW ORDER

Customer:
Name: [Customer Name]
Phone: [Phone Number]
Address: [Address]

Selected Games:
1. Game Name - 70 GB
2. Game Name - 95 GB
3. Game Name - 42 GB

Total Games: 3
Estimated Total Size: 207 GB

Notes:
[Customer Notes]

Keep the existing working Telegram sending mechanism.

Only improve the message content/format if needed.

---

# Phase 11 – Responsive Design

Make sure all branding and UI changes work correctly on:

- Mobile phones
- Tablets
- Desktop screens

Important elements must remain readable on small screens.

Pay special attention to:

- Game cards
- Images
- Total storage summary
- Customer form
- Confirmation page
- Navigation
- Logo

---

# Phase 12 – Preserve Existing Functionality

Before considering the work complete, verify that the following still work:

1. Games load correctly.
2. Game images display correctly.
3. A game can be selected.
4. A selected game can be removed/deselected.
5. Multiple games can be selected.
6. Individual game sizes display correctly.
7. Total storage is calculated correctly.
8. Customer information can be entered.
9. Order review displays the correct information.
10. Order confirmation works.
11. Telegram receives the order.
12. The website still works after deployment to Netlify.
13. No broken asset paths exist.
14. Logo works correctly after Netlify deployment.
15. Mobile layout still works correctly.

---

# Important Development Rules

Work on one phase at a time.

Do not perform a complete rewrite.

Reuse the current components and structure whenever possible.

Keep existing JavaScript logic unless a change is necessary.

Avoid adding unnecessary frameworks or libraries.

Do not change the deployment method.

The project must remain compatible with Netlify.

Do not delete existing working features.

Do not modify Telegram integration unless required for the new order message format.

Do not replace real project data with demo data.

Do not invent game information.

If real game data is not available yet, preserve the current data structure so it can be replaced later.

After each phase:

1. Check that the website still runs.
2. Check the browser console for errors.
3. Fix any errors introduced by the changes.
4. Then continue to the next phase.

---

# Final Goal

The final website should feel like a real technology/gaming service called:

# DRIVE DEALS

Its purpose should be immediately clear:

Customers select games, see how much storage the selected games require, enter their information, review the order, and send the request to DRIVE DEALS through the existing Telegram ordering system.

The final design should primarily use modern blue and cyan colors and have a professional gaming/technology identity.