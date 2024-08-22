import Utilities from "../appActions/Utilities";
const util = new Utilities();

/**
 *
 */
class createAccount {
  path = "/create-account";
  title = "British Columbia Short Term Rental Registration";

  //button: string = 'button[data-cy="button"]';
  accountPageTitle: string = 'h1[data-cy="accountPageTitle"]';
  alertsMessageInfo: string = 'div[data-cy="alertsMessage:info"]';
  contactInformation: string = 'div[data-cy="contact-information"]';
  createAccountPage: string = 'div[data-cy="create-account-page"]';
  feeWidget: string = 'div[data-cy="fee-widget"]';
  footer: string = 'footer[data-cy="footer"]';
  formSection: string = 'div[data-cy="form-section"]';
  formSectionContact: string = 'div[data-cy="form-section-contact"]';
  formSectionContactInfo: string = 'div[data-cy="form-section-contact-info"]';
  formSectionCraInfo: string = 'div[data-cy="form-section-cra-info"]';
  formSectionMailing: string = 'div[data-cy="form-section-mailing"]';
  step1 = 'h2[data-cy="h2"]:contains("Step 1 - Contact Information")';
  primaryContactAddress: string = "#primaryContactAddress";
  stepper: string = 'div[data-cy="stepper"]';
  stepperFooter: string = 'div[data-cy="stepper-footer"]';
  nextButton: string = 'button[data-cy="button"]:contains("Next")';
  anotherContactButton: string = 'button[data-cy="button"]:contains("Add Another Contact")';
  backButton: string = 'button[data-cy="button"]:contains("Back")';
  submitButton: string = 'button[data-cy="button"]:contains("Submit and Pay")';
}
export default createAccount;
