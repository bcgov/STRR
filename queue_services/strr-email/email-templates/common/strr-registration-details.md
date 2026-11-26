## Registration details

**Registration Number:** {% if registration_url %}[{{ reg_num }}]({{ registration_url }}){% else %}{{ reg_num }}{% endif %}\
**Expiry Date:** {{ expiry_date }}

**Short-Term Rental Address:**\
{% if unit_number %}**Unit Number:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{unit_number}}\
{% endif %}**Street Number:**&nbsp; {{street_number}}\
**Street Name:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{street_name}}\
**City:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{city}}\
**Province:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{province}}\
**Postal Code:**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{postal_code}}