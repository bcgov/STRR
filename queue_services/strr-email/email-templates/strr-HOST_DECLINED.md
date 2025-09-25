# Short-Term Rental Application Refused

**Application Number:**
{{ application_num }}

{% if rental_nickname %}
**Short-Term Rental Nickname:**
{{rental_nickname}}
{% endif %}

**Short-Term Rental Address:**
**Unit Number:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{unit_number}}
**Street Number:**&nbsp;  {{street_number}}  
**Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    {{street_name}}  
**City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}  
**Province:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{province}}
**Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}

Your application to register the above short-term rental has been **refused**.

---

# Refusal Details

{% if noc_sent_date %}
A Notice of Consideration letter was sent to {{ client_recipients }} on **{{ noc_sent_date }}**. The notice informed you that your short-term rental application was under review, outlined the necessary steps to take, and allowed you to respond by the deadline of **{{ noc_expiry_date }}**.

{% endif %}
After a fulsome review of all documents provided, it appears your application does not meet all the registration requirements.

{{custom_content | escape }}

Your short-term rental application has been refused. For more information, please contact [Registry.STR@gov.bc.ca](mailto:Registry.STR@gov.bc.ca).

---

# What Happens Next
**Reapply:**  If you believe you can address the issues identified in your application, you can [reapply to register your short-term rental](https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/registry/host-registration). Before you do so, ensure you are in compliance with all local bylaws and have all required documents ready.

**Request a Review:** If you choose to request a review of the refusal decision, please be aware that only **very limited** circumstances are eligible for a review.

To learn more about next step options, visit our [website](https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/registry/host-registration#afteryouapply).

---
*Under section 10(2) of the _Short-Term Rental Accommodations Act_ (the "Act"), the Registrar may cancel or suspend a registration if it does not meet the short-term rental offer registration requirements under section 6 of the Act.

---

**Short-Term Rental Branch**
Ministry of Housing and Municipal Affairs
