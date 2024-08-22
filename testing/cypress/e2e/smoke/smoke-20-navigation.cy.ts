// Cypress Test: Navigation
// It verifies if all pages are operational.

import Utilities from "../../appActions/Utilities";
import HomePage from "../../pageObjects/homePage";
import CreateAccount from "../../pageObjects/createAccount";
import CommonElements from "../../pageObjects/commonelements";
let util = new Utilities();
let common = new CommonElements();

describe("Navigation", () => {
  beforeEach(() => {
    cy.setid("bcsc");
    cy.login();
  });

  afterEach(() => {
    cy.logout();
  });
  it("Check HomePage", () => {
    let homepage = new HomePage();
    cy.visit(homepage.path);

    cy.get(common.Header).should("be.visible");
    cy.title().should("eq", homepage.title);
    cy.contains(common.strrTitle, "BC Registries and Online Services");
  });

  it("Check CreateAccount", () => {
    let createaccount = new CreateAccount();
    cy.visit(createaccount.path);

    cy.get(common.Header).should("be.visible");
    cy.title().should("eq", createaccount.title);
    cy.contains(common.strrTitle, "BC Registries and Online Services");

    cy.contains(createaccount.accountPageTitle, "Short-Term Rental Registration");
    cy.get(createaccount.step1).should("be.visible");
    cy.get(createaccount.stepper).should("be.visible");
    cy.get(createaccount.stepperFooter).should("be.visible");

    cy.get(createaccount.anotherContactButton).should("be.visible");
    cy.get(createaccount.nextButton).should("be.visible");
    cy.get(createaccount.nextButton).click();

    cy.get(createaccount.backButton).should("be.visible");
    
    cy.get(createaccount.nextButton).click();
    cy.get(createaccount.nextButton).click();
    
    cy.get(createaccount.submitButton).should("be.visible");
    

  });
});
