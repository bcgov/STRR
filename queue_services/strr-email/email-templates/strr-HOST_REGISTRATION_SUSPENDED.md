# Short-Term Rental Registration Suspended

**Registration Number:**
{% if registration_url %}[{{ reg_num }}]({{ registration_url }}){% else %}{{ reg_num }}{% endif %}

{% if rental_nickname %}
**Short-Term Rental Nickname:**
{{rental_nickname}}
{% endif %}

{% if unit_number %}
**Short-Term Rental Address:**
**Unit Number:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{unit_number}}
**Street Number:**&nbsp; {{street_number}}
**Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{street_name}}
**City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}
**Province:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{province}}
**Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}
{% else %}
**Short-Term Rental Address:**
**Street Number:**&nbsp; {{street_number}}
**Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{street_name}}
**City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}
**Province:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{province}}
**Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}
{% endif %}

Your short-term rental registration has been **suspended**.

---

# Suspension Information

{{custom_content | escape }}

---

# Next Steps

**Reinstate Registration:** To have your registration reinstated, you must provide any required documents or meet any required conditions listed in the Required Documents or Conditions section, by the deadline noted above.

**Request a Review:** If you choose to request a review of the suspension decision, please be aware that only very limited circumstances are eligible for a review. To learn more about this option, visit our [website](https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/registry/host-registration#afteryouapply).

---

\*\*Under section 10(2) of the _Short-Term Rental Accommodations Act_, the Registrar may cancel or suspend a registration if it does not meet the short-term rental offer registration requirements under section 6 or 7 of the Act.

---

**Short-Term Rental Branch**
Ministry of Housing and Municipal Affairs
