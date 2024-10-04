// Cypress Test: Navigation
// It verifies if all pages are operational.

import Utilities from "../appActions/Utilities";
import CreateAccount from "../pageObjects/createAccount";
import CommonElements from "../pageObjects/commonElements";
import { realClick } from "cypress-real-events/commands/realClick";
let util = new Utilities();
let common = new CommonElements();
const data = { smoketest: true }; // Set smoke test flag for test run

describe("Create Account", () => {
  beforeEach(() => {
    cy.setid("bcsc");
    cy.login();
  });

  afterEach(() => {
    cy.logout();
  }); 

  /* ==== Test Created with Cypress Studio ==== */
  it("create", function () {
    let createaccount = new CreateAccount();
    cy.visit(createaccount.path);
    cy.get(common.Header).should("be.visible");
    cy.title().should("eq", createaccount.title);
    cy.contains(common.strrTitle, "BC Registries and Online Services");

    // Step 1
    cy.get(createaccount.contactInformation).within(() => {
      cy.get(createaccount.birthDay).type("21");
      cy.get(createaccount.month).select("04");
      cy.get(createaccount.birthYear).type("1976");
      cy.get(createaccount.socialInsuranceNumber).type("999 999 999");
      cy.get(createaccount.businessNumber).type("199 999 999");
      cy.get(createaccount.preferredName).type("Preferred Name");
      cy.get(createaccount.phoneNumber).type("1231234567");
      cy.get(createaccount.extension).type("123");
      cy.get(createaccount.faxNumber).type("1230456789");
      cy.get(createaccount.emailAddress).type("x@x.com");

      cy.get(createaccount.country).select("Canada");
      cy.get(createaccount.address).clear();
      cy.get(createaccount.address)
        .type("1239 Hillgrove Rd")
        .then(() => {
          cy.get(createaccount.address).realClick();
        });
      cy.get(createaccount.addressLineTwo).focus().type("basement");
      cy.get(createaccount.city).clear();
      cy.get(createaccount.city).type("North Saaanich");
      cy.get(createaccount.province).focus().type("BC", { force: true });
      cy.get(createaccount.postalCode).clear();
      cy.get(createaccount.postalCode).type("V8L 5K7");
    });

    // Next Step
    cy.get(createaccount.nextButton).focus().click();

    // Step 2

    cy.get(createaccount.nickname).type("Nickname");
    cy.get(createaccount.useMailing).check();
    cy.get(createaccount.addressProperty).type("5951 237a St");
    cy.get(createaccount.addressLineTwoProperty).type("basement");
    cy.get(createaccount.cityProperty).type("Langley");
    cy.get(createaccount.provinceProperty)
      .clear({ force: true })
      .type("BC", { force: true });
    cy.get(createaccount.postalCodeProperty).type("V2Z 1A6");

    cy.get(createaccount.parcelIdentifier).type("123-123-123");
    cy.get(createaccount.businessLicense).type("BL1234");

    cy.get(createaccount.propertyType).select(
      "All or part of primary dwelling"
    );
    cy.get(createaccount.ownershipType).select("Rent");
    cy.get(createaccount.url).type(
      "https://dev.sandbox.loginproxy.gov.bc.ca/auth"
    );

    // next step
    cy.get(createaccount.nextButton).click();

    // Step 3
    cy.get(createaccount.principalResidence).eq(0).check();
    cy.get(createaccount.declaration).check();

    // next step
    cy.get(createaccount.nextButton).click();

    // Step 4
    cy.get(createaccount.confirmation).check();
    cy.get(createaccount.submitButton).click();

  });
});

