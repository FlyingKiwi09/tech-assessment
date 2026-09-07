/**
 * Visits an app page with the build seed applied.
 *
 *   cy.visitApp('/index.html')
 *   cy.visitApp('/booking.html', { coach: 'c3' })
 */
Cypress.Commands.add('visitApp', (path, query = {}) => {
  const params = new URLSearchParams({ ...query, seed: Cypress.env('seed') });
  return cy.visit(`${path}?${params.toString()}`);
});
