# Short-Term Rental Registration Approved

**Registration Number:**
{{ reg_num }}

**Registration Expiry Date:**
{{ expiry_date }}

{% if rental_nickname %}
**Short-Term Rental Nickname:**
{{rental_nickname}}
{% endif %}

{% if unit_number %}
**Short-Term Rental Address:**
**Unit Number:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{unit_number}}
**Street Number:**&nbsp;  {{street_number}}  
**Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    {{street_name}}  
**City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}  
**Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}
{% else %}
**Short-Term Rental Address:**
**Street Number:**&nbsp;  {{street_number}}  
**Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    {{street_name}}  
**City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}  
**Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}
{% endif %}

Your application to register the short-term rental is **approved**.

---

# Terms and Conditions
{% if custom_content %}
{{custom_content | escape }}

{% endif %}
The registration is subject to [Terms and Conditions]({{ tac_url }}). Failure to comply may result in the suspension or cancellation of your registration.

---

# Important Next Steps
1. Log in to the platform where your short-term rental is listed, such as Airbnb, Vrbo, or another booking site.

2. Follow the platform instructions to update your listing with your **Registration Number** and **Short-Term Rental Address**.
  
3. Repeat the above steps for **each platform** your short-term rental is listed on.

---

[[strr-footer.md]]
