import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import CreateAccountPage from '../pageObjects/createAccount';
import Utilities from './Utilities';
let util = new Utilities();

class Account {
  // Instantiate the page objects we'll be working with
  accountcreatePage = new CreateAccountPage();

  // Account Variables
  test_id: string;
  id: string;
  
  contact: {
    birthday: string;
    birthmonth: string;
    birthyear: string;
    socialinsurancenumber: string;
    businessnumber: string;
    preferredname: string;
    phonenumber: string;
    extension: string;
    faxnumber: string;
    emailaddress: string;
    country: string;
    address: string;
    city: string;
    province: string;
    postalcode: string;
  }[];
  
  unit: {
    nickname: string;
    usemailingaddress: boolean;
    country: string;
    address: string;
    addresslinetwo: string; 
    city: string;
    province: string;
    postalcode: string;
    parcelidentifier: string;
    businesslicence: string;
    propertytype: string;
    ownershiptype: string;
    platforms: {
      url: string;
    }[];
    principalresidencerequired: boolean;
    agreedtorentalact: boolean;
  };
  
  smoketest: boolean;
  localtest: boolean;
  delete: boolean;
  


  // Actions



  createAccount() {
    cy.log('Create Account: ' + this.test_id);
    this.accountcreatePage.startAccount();

    // Create Contact Information

    // Create Unit Information
        // Step 2

        cy.get(this.accountcreatePage.nickname).type(this.unit.nickname);
        if (this.unit.usemailingaddress) {
          cy.get(this.accountcreatePage.useMailing).check();
        }
        cy.get(this.accountcreatePage.addressProperty).type(this.unit.address);
        cy.get(this.accountcreatePage.addressLineTwoProperty).type(this.unit.addresslinetwo);
        cy.get(this.accountcreatePage.cityProperty).type(this.unit.city);
        cy.get(this.accountcreatePage.provinceProperty)
          .clear({ force: true })
          .type(this.unit.province, { force: true });
        cy.get(this.accountcreatePage.postalCodeProperty).type(this.unit.postalcode);
    
        cy.get(this.accountcreatePage.parcelIdentifier).type("123-123-123");
        cy.get(this.accountcreatePage.businessLicense).type("BL1234");
    
        cy.get(this.accountcreatePage.propertyType).select(
          "All or part of primary dwelling"
        );
        cy.get(this.accountcreatePage.ownershipType).select("Rent");
        cy.get(this.accountcreatePage.url).type(
          "https://dev.sandbox.loginproxy.gov.bc.ca/auth"
        );
     = value.create.nickname;
    this.unit.usemailingaddress = value.create.usemailingaddress;
    this.unit.country = value.create.country;
    this.unit.address = value.create.address;
    this.unit.city = value.create.city;
    this.unit.province = value.create.province;
    this.unit.postalcode = value.create.postalcode;
    this.unit.parcelidentifier = value.create.parcelidentifier;
    this.unit.businesslicence = value.create.businesslicence;
    this.unit.propertytype = value.create.propertytype;
    this.unit.ownershiptype = value.create.ownershiptype;
    this.unit.platforms = value.create.platforms;
    this.unit.principalresidencerequired = value.create.principalresidencerequired;
    this.unit.agreedtorentalact = value.create.agreedtorentalact;
    
  }

  updateAccount(id: string): boolean {
    cy.log('Update Account: ' + id);
    return true;
  }

  deleteAccount(id: string) {
    cy.log('Delete Account: ' + id);
    
  }

  // Tools

  populateCreateContent(value: any) {
    this.test_id = value.create.test_id;
    this.id = value.create.id;
    this.contact = value.create.contact;


/*     this.birthday = value.create.birthday;
    this.birthmonth = value.create.birthmonth;
    this.birthyear = value.create.birthyear;
    this.socialinsurancenumber = value.create.socialinsurancenumber;
    this.businessnumber = value.create.businessnumber;
    this.preferredname = value.create.preferredname;
    this.phonenumber = value.create.phonenumber;
    this.extension = value.create.extension;
    this.faxnumber = value.create.faxnumber;
    this.emailaddress = value.create.emailaddress;
    this.country = value.create.country;
    this.address = value.create.address;
    this.city = value.create.city;
    this.province = value.create.province;
    this.postalcode = value.create.postalcode; */

    this.unit = value.create.unit;


    
    this.smoketest = value.create.smoketest;
    this.localtest = value.create.localtest;
    this.delete = value.create.delete;
    
  }
 
}

export default Account;
