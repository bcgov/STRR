import data from "../fixtures/application.json"; // The data file will drive the tests
import Account from "../appActions/Account";
import Utilities from "../appActions/Utilities";
let testData = data;
let util = new Utilities();

describe("Create Application", () => {
  beforeEach(() => {
    cy.clearAllCookies();
  });

  afterEach(() => {
    cy.logout();
  });

  // Iterate through the JSON file and create a Application for each entry
  // The set up below allows for reporting on each test case
  testData.forEach((data, index) => {
    if (util.runOk(data)) {
      let account = new Account();

      it(`Create Application (Test ID: ${data.test_id})`, () => {
        cy.setid(null).then(() => {
          cy.login(null, null, null, null);
        });
        account.populateCreateContent(data);
        account.createAccount();
        cy.log("Application Created: " + account.id);
      });
    }
  });
});
