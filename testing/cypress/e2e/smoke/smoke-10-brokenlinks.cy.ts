// Cypress Test: Check for Broken Static Links
// This spec checks for broken links on the home page, including the header and footer.
// It verifies if the specified links are operational.
// It does not test if the links are correct.

describe("Check for Broken Static Links", () => {
  beforeEach(() => {
    cy.setid("bcsc");
    cy.login();
  });

  afterEach(() => {
    cy.logout();
  });
  it("Check All Static Links", () => {
    // Iterate through all the links on the page
    // If the link has a specified URL, check if the link is operational
    cy.wait(3000);
    cy.linkChecker();
  });
});
