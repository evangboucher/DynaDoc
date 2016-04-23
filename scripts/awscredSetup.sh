#!/bin/bash

# This file is borrowed with permission from the
# author. This is not an original part of DynaDoc.

# Setup script to help developers put their AWS
# Credentials into their terminal environment
# for testing.
# Run: source awscredSetup.sh
# @CopyRight InstaTime
# @author: Evan Boucher
# @created: 04/23/2016

#
echo "Welcome to AWS Credential Setup!"
echo "This script will setup your environemnt credentials for DynaDoc"
#Prompt to set a new accessKeyId
AccessPrompt="yes"
SecretPrompt="yes"
RegionPrompt="yes"
echo "${accessKeyId+1}"
if [[ "${accessKeyId}" -ne "" ]]; then
    echo "Access key is not empty."
fi
if [[ ${accessKeyId+1}="1" ]]; then
    echo "Looks like you already have accessKeyId set."
    echo ""
    echo "It is currently set to: $accessKeyId"
    echo "Would you like to change accessKeyId? (y/n)"
    echo "default (n):"
    read -n 1 setResponse
    echo ""
    if [[ "$setResponse" = ""  ||  "$setResponse" = "n" ]]; then
        #do nothing.
        AccessPrompt="no"
    fi
    echo ""
fi


if [[ "$AccessPrompt" = "yes" ]]; then
    echo "Please enter your AWS Access Key ID:"
    read accessKeyId
    echo ""
fi


if [[ ${secretAccessKey+1}="1" ]]; then
    echo "Looks like you already have secretAccessKey set."
    echo ""
    echo "It is currently set to: $secretAccessKey"
    echo "Would you like to change secretAccessKey? (y/n)"
    echo "default (n):"
    read -n 1 setResponse
    echo ""
    if [[ "$setResponse" = "" || "$setResponse" = "n" ]]; then
        #do nothing.
        SecretPrompt="no"
    fi
    echo ""
fi

if [[ "$SecretPrompt" = "yes" ]]; then
    echo "Please enter your AWS Secret Key ID:"
    read secretAccessKey
    echo ""
fi

if [[ ${region+1}="1" ]]; then
    echo "Looks like you already have region set."
    echo ""
    echo "It is currently set to: $region"
    echo "Would you like to change region? (y/n)"
    echo "default (n):"
    read -n 1 setResponse
    echo ""
    if [[ "$setResponse" = "" || "$setResponse" = "n" ]]; then
        #do nothing.
        RegionPrompt="no"
    fi
    echo ""
fi

DEFAULT_REGION="us-east-1"
if [[ "$RegionPrompt" = "yes" ]]; then
    echo "Please enter your AWS Region (hit enter to default to us-east-1):"
    echo "Default: us-east-1":
    read -s region
    if [[ "$region" = "" ]]; then
        region=$DEFAULT_REGION
    fi
    echo "region is: $region"
    echo ""
fi
export accessKeyId
export secretAccessKey
export region

echo "You may now access your secret key environment variables"
echo ""
echo "accessKeyId: $accessKeyId"
echo "secretAccessKey: $secretAccessKey"
echo "region: $region"
echo ""


echo "Exit AWS Credential Setup Script"
