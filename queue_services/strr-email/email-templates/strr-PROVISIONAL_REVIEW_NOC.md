# Notice of Consideration of Short-Term Rental Registration

**Registration Number:**
{{reg_num}}

{% if rental_nickname %}
**Short-Term Rental Nickname:**
{{rental_nickname}}
{% endif %}

**Short-Term Rental Address:**  
{% if address_street_extra %}{{ address_street }}
  {{ address_street_extra }}
  {{ address_region }}
  {% else %}{{ address_street }}
  {{ address_region }}
  {% endif %}

Your short-term rental that was provisionally approved is currently under review. **Your action is required**.  

---

# Important Next Steps
It appears your provisional registration may not meet all the registration requirements. The following issues need your attention.

{{noc_content | escape }}

Please **log in** to your [Short Term Rental Registry Dashboard](https://host.shorttermrental.registry.gov.bc.ca/en-CA/auth/login/) to **upload your documents and submissions** before the due date.

If you need help uploading your documents or have any questions, please contact [Registry.STR@gov.bc.ca](mailto:Registry.STR@gov.bc.ca).

---
# Important Deadlines
**Submission Deadline: {{noc_expiry_date}} 12:01 am Pacific time.**

You have an opportunity to be heard. Please provide the required information or documents by the deadline noted above. If we do not receive the necessary information by the deadline, your provisional registration **may be cancelled** without further notice*.

Please be aware that we may not reach a final decision until after the deadline has passed.

---
*Under section 10(2) of the _Short-Term Rental Accommodations Act_ (the "Act"), the Registrar may cancel or suspend a registration if it does not meet the short-term rental offer registration requirements under section 6 of the Act.

---

**Short-Term Rental Branch**  
Housing and Land Use Policy Division  
Ministry of Housing and Municipal Affairs
