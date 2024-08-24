import Utilities from "../appActions/Utilities";
const util = new Utilities();

/**
 *
 */
class createAccount {
  path = "/create-account";
  title = "British Columbia Short Term Rental Registration";

  //button: string = 'button[data-test-id="button"]';
  accountPageTitle: string = 'h1[data-test-id="accountPageTitle"]';
  alertsMessageInfo: string = 'div[data-test-id="alertsMessage:info"]';
  contactInformation: string = 'div[data-test-id="contact-information"]';
  createAccountPage: string = 'div[data-test-id="create-account-page"]';
  feeWidget: string = 'div[data-test-id="fee-widget"]';
  footer: string = 'footer[data-test-id="footer"]';
  formSection: string = 'div[data-test-id="form-section"]';
  formSectionContact: string = 'div[data-test-id="form-section-contact"]';
  formSectionContactInfo: string =
    'div[data-test-id="form-section-contact-info"]';
  formSectionCraInfo: string = 'div[data-test-id="form-section-cra-info"]';
  formSectionMailing: string = 'div[data-test-id="form-section-mailing"]';
  step1 = 'h2[data-test-id="h2"]:contains("Step 1 - Contact Information")';
  primaryContactAddress: string = "#primaryContactAddress";
  stepper: string = 'div[data-test-id="stepper"]';
  stepperFooter: string = 'div[data-test-id="stepper-footer"]';

  propertyFormSection: string = 'div[data-test-id="form-section-property"]';

  // Buttons
  nextButton: string = 'button[data-test-id="button"]:contains("Next")';
  anotherContactButton: string =
    'button[data-test-id="button"]:contains("Add Another Contact")';
  backButton: string = 'button[data-test-id="button"]:contains("Back")';
  submitButton: string =
    'button[data-test-id="button"]:contains("Submit and Pay")';

  // Inputs Step 1
  birthDay: string = 'input[name="birthDay"]';
  month: string = 'select[name="month"]';
  birthYear: string = 'input[name="birthYear"]';
  socialInsuranceNumber: string = 'input[name="socialInsuranceNumber"]';
  businessNumber: string = 'input[name="businessNumber"]';
  preferredName: string = 'input[name="preferredName"]';
  phoneNumber: string = 'input[name="phoneNumber"]';
  extension: string = 'input[name="extension"]';
  faxNumber: string = 'input[name="faxNumber"]';
  emailAddress: string = 'input[name="emailAddress"]';
  country: string = 'select[name="country"]';
  address: string = 'input[name="address"]';
  addressLineTwo: string = 'input[name="addressLineTwo"]';
  city: string = 'input[name="city"]';
  province: string = 'input[name="province"]';
  postalCode: string = 'input[name="postalCode"]';

  // Step 2
  nickname: string = 'input[name="nickname"]';
  useMailing: string = 'input[name="useMailing"][type="checkbox"]';
  countryProperty: string = 'select[name="country"]';
  addressProperty: string = '#propertyAddress';
  addressLineTwoProperty: string = 'input[name="AddressLineTwo"]';
  cityProperty: string = 'input[name="city"]';
  provinceProperty: string = 'input[name="province"]';
  postalCodeProperty: string = 'input[name="postalCode"]';
  parcelIdentifier: string = 'input[name="parcelIdentifier"]';
  businessLicense: string = 'input[name="businessLicense"]';
  propertyType: string = 'select[name="propertyType"]';
  ownershipType: string = 'select[name="ownershipType"]';
  url: string = 'input[name="url"]';

  // step 3
  principalResidence: string = 'input[type="radio"]';
  declaration: string = 'input[name="declaration"][type="checkbox"]';
  confirmation: string = 'input[type="checkbox"]';

}
export default createAccount;
