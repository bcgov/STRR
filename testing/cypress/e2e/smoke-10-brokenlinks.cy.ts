// Cypress Test: Check for Broken Static Links
// This spec checks for broken links on the home page, including the header and footer.
// It verifies if the specified links are operational.
// It does not test if the links are correct.

import Utilities from "../appActions/Utilities";
let util = new Utilities();
const data = { smoketest: true }; // Set smoke test flag for test run

describe("Check for Broken Static Links", () => {
  beforeEach(() => {
    cy.setid("bcsc");
    cy.login();
  });

  afterEach(() => {
    cy.logout();
  });

  /*  */

  if (util.runOk(data)) {
    console.log(data);
    it("Check All Static Links", () => {
      // Iterate through all the links on the page
      // If the link has a specified URL, check if the link is operational
      cy.wait(3000);
      cy.linkChecker();
    });
  }
});
