import cypress from "cypress";

describe('variable Test', () => {
    it('should get variables', () => {
        let users = Cypress.env('users');
        cy.log(Cypress.env('host'));
        let authurls = Cypress.env('authurls');
        cy.log(authurls["siteminder"])
        cy.log(authurls["loginproxy"])
        cy.log(authurls["keycloak"])
        cy.log(authurls["bcscredirect"])
        let creditcard = Cypress.env('creditcard');
        cy.log(creditcard["ccnumber"])
        cy.log(creditcard["expirymonth"])
        cy.log(creditcard["expiryyear"])
        cy.log(creditcard["cvv"])
    });
  });