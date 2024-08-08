/**
 * Represents the Login Proxy page object.
 */
class LoginProxy {
  authurls = Cypress.env('authurls');
  path = this.authurls["loginproxy"];

  idirButton = "#social-idir"; // Define the IDIR button selector
  azidirButton = "#social-azureidir";
  bcscButton = "#social-bcsc";
  githubButton = "#social-github";
  bceidButton = "#social-bceid";

  headerWrapper = "#kc-header-wrapper";
  headerText = "bcregistry";

  /**
   * Check the Login Proxy page.
   */
  checkLoginProxyPage() {
    cy.get(this.headerWrapper).contains(this.headerText).should("be.visible");
  }

  /**
   * Choose IDIR authentication.
   */
  chooseIdir() {
    cy.get(this.idirButton).click();
  }

  /**
   * Choose Azure IDIR authentication.
   */
  chooseAzIdir() {
    cy.get(this.azidirButton).click();
  }
  /**
   * Choose BC Services card authentication.
   */
  chooseBcsc() {
    cy.get(this.bcscButton).click();
  }
}

export default LoginProxy;
