/// <reference types="cypress" />

// Example spec — it passes as-is. Use it to check your setup, then delete or
// replace it with your own suite.

describe('smoke', () => {
  it('loads the dashboard', () => {
    cy.visitApp('/index.html');
    cy.contains('h1', 'Good morning');
    cy.get('[data-testid="stat-upcoming"]').should('exist');
  });

  it('lists coaches', () => {
    cy.visitApp('/coaches.html');
    cy.get('[data-testid="coach-card"]').should('have.length.greaterThan', 0);
  });
});
