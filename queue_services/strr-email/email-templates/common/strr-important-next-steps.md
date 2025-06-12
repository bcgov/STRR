# Important Next Steps
1. Log in to the platform where your short-term rental is listed, such as Airbnb, Vrbo, or another booking site.

1. Follow the platform instructions to update your listing with your registration information below.
  {% if unit_number %}
  ^**Registration Number:** 
  {{ reg_num }}

  ^**Short-Term Rental Address:**  
  **Unit Number:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{unit_number}}  
  **Street Number:**&nbsp;  {{street_number}}  
  **Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    {{street_name}}  
  **City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}  
  **Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}
  {% else %}
  ^**Registration Number:** 
  {{ reg_num }}

  ^**Short-Term Rental Address:**
  **Street Number:**&nbsp;  {{street_number}}  
  **Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    {{street_name}}  
  **City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}  
  **Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}
  {% endif %}
1. Repeat the above steps for each platform your short-term rental is listed on.
