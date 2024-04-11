SUBMISSION_DICT = {
    'businessIdentifier': 'BC1234567',
    'effectiveDate': '2023-12-31',
    'entityStatement': {
        "statementID": "1234qwe423",
        "statementType": "entityStatement",
        "statementDate": "1999-04-11",
        "isComponent": False,
        "entityType": "registeredEntity",
        "name": "Test Entity",
        "identifiers": [],
    },
    "personStatements": [
        {
            "statementID": "0987rncn99",
            "statementType": "personStatement",
            "statementDate": "2020-09-05",
            "isComponent": False,
            "personType": "knownPerson",
            "names": [{"type": "individual", "fullName": "Full Name"}],
            "hasTaxNumber": True,
            "email": "test@test.gov.bc.ca",
            "nationalities": [{"name": "Canada", "code": "CA"}],
        }
    ],
    "ownershipOrControlStatements": [
        {
            "statementID": "12342djmce3",
            "statementType": "ownershipOrControlStatement",
            "statementDate": "2021-10-13",
            "isComponent": False,
            "subject": {
                "describedByEntityStatement": "1234qwe423"
            },
            "interestedParty": {
                "describedByPersonStatement": "0987rncn99"
            },
            "interests": [
                {
                    "type": "otherInfluenceOrControl",
                    "directOrIndirect": "direct",
                    "beneficialOwnershipOrControl": True,
                    "details": "",
                    "share": {"exact": 27},
                    "startDate": "2021-02-01"
                },
                {
                    "type": "shareholding",
                    "directOrIndirect": "unknown",
                    "beneficialOwnershipOrControl": True,
                    "details": "SharesThroughRightsOrExercisedInConcert",
                    "startDate": "2021-01-01"
                },
                {
                    "type": "appointmentOfBoard",
                    "directOrIndirect": "direct",
                    "beneficialOwnershipOrControl": True,
                    "details": "",
                    "startDate": "2021-01-05"
                }
            ]
        }
    ]
}