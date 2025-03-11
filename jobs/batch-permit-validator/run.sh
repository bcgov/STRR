#!/bin/bash

echo "File Name: $1"

cd src/batch_permit_validator
python3 -m batch_permit_validator $1
