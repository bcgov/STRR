
- Start Date: 2025-02-24
- Target Major Version:
- Reference Issues: n/a
- Entity Issue: [22134](https://github.com/bcgov/entity/issues/26029)
- Implementation PR: (leave this empty)


## Overview

For the STRR batch permit validator, by implementing Redis caching effectively, the load on external services and databases,
the errors due to the rate limiting of the third party service etc. can be reduced resulting in increased throughput,
reduced system failures and lower latency.

## Motivation
Platforms like Airbnb, vrbo etc. will submit bulk requests for permit validation. Some of these record requests can have up to
50k records. The batch will be submitted daily. Also, the same address/permit entry will be part of batch validation requests
by different platforms.

Some addresses are exempt from the short term rental requirements. The information regarding whether an address is determined
using a third party service call. The information changes very rarely. Inorder to not overwhelm the third party service,
this information can be cached in Cloud Memorystore for Redis after the first service call and can be looked up in the cache
for the subsequent calls.

The batch permit validator splits the records to chunks and process them in parallel. There are high chances of hitting
the rate limits for the external API. Once the data regarding whether an address is exempt or not, this data will be 
cached and the API will not be called for the subsequent requests for the same address.

In addition to this, the cache may be stored to use the basic permit information that will be used by the validator.
Registration information does not change for a year, unless the registration is suspended/cancelled for non compliance.
This will significantly reduce the db calls resulting in an improved performance.

## Steps
1. Batch Permit Validator receives a request from the platform
2. For each record in the json, the validator does the following
   * If a permit identifier is not present, it checks the cache whether the address entry exists. If the entry exists,
     the information in the cache will be used to process that record. If the entry is not present, the validator calls
     the external API, use the response for processing and saves the response in the cache to prevent the further
     calls to the external API for the same address.
   
   * If a permit identifier is  present, it checks the cache whether the identifier entry exists. If the entry exists,
     the information in the cache will be used to process that record. If the entry is not present, the validator calls
     looks up the database, use the response for processing and saves the response in the cache to prevent the further
     db calls for the same identifier.


### Cache Eviction/Updation strategy
The entries in the cache will not have a default TTL.

The permit entries will be evicted by the API/ Job when the registration status gets updated. Currently, a PUT to the
registration is not allowed and the only change to the registration is the status update

For the address caching, there is an agreement that the dev/support team will be notified when housing updates the
jurisdiction data for exemption. A job can be built to remove the address entries from the cache and this job can be
executed on a need basis.


