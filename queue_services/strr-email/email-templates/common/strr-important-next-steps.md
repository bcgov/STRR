# Important Next Steps
1. Go to a platform that your short-term rental is listed on (e.g., https://str-platform-example.com).

1. Follow the platform instructions to update your listing with your registration information below.
  ^**Registration Number:** 
  {{ reg_num }}

  ^**Short-Term Rental Address:** 
  {% if address_street_extra %}{{ address_street }}
  {{ address_street_extra }}
  {{ address_region }}
  {% else %}{{ address_street }}
  {{ address_region }}
  {% endif %}
1. Repeat the above steps for each platform your short-term rental is listed on.