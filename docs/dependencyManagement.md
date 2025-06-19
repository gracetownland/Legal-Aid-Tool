# Dependency Management Guide

## Overview

This document explains how Python dependencies are locked and managed across Lambda functions in this project to ensure reproducible builds and security.

## Lambda Functions with Locked Dependencies

The following Lambda functions have their dependencies locked using pip-tools:

| Lambda Function | Location | Requirements File |
|----------------|----------|-------------------|
| `case_generation` | `cdk/lambda/case_generation/` | `requirements.txt` |
| `text_generation` | `cdk/lambda/text_generation/` | `requirements.txt` |
| `summary_generation` | `cdk/lambda/summary_generation/` | `requirements.txt` |
| `audioToText` | `cdk/lambda/audioToText/` | `requirements.txt` |

## How Dependencies Were Locked

### 1. Requirements Structure

Each Lambda function uses a two-file approach:
- `requirements.in` - Contains high-level dependencies (what we directly need)
- `requirements.txt` - Contains all dependencies with exact versions (generated from requirements.in)

### 2. Locking Process

Dependencies were locked using pip-tools within Docker containers to ensure consistency:

```bash
# Example for case_generation Lambda
docker run --rm -v ${PWD}:/app -w /app public.ecr.aws/lambda/python:3.11 bash -c "
  pip install pip-tools && 
  pip-compile cdk/lambda/case_generation/requirements.in
"
```

### 3. Key Locked Dependencies

**LangChain Ecosystem:**
```
langchain==0.3.25
langchain-aws==0.2.25
langchain-community==0.3.25
langchain-core==0.3.65
langchain-postgres==0.0.14
```

**Database Connectivity:**
```
psycopg[binary]==3.2.9
```

**AWS Services:**
```
boto3==1.38.37
botocore==1.38.37
```

## How to Modify Dependencies

### Adding New Dependencies

1. **Add to requirements.in:**
   Within the requirements.in file, add the new package required (with specific version or not).

2. **Build Docker image locally:**
   ```bash
   # Navigate to the Lambda function directory
   cd cdk/lambda/case_generation
   
   # Build the Docker image locally
   docker build -t case-gen-image .
   ```

3. **Regenerate requirements.txt:**
   ```bash
   # Run pip-compile inside the built container
   docker run --rm -v ${PWD}:/app -w /app case-gen-image bash -c "
     pip install pip-tools && 
     pip-compile requirements.in
   "
   ```

4. **Commit and push the new changes:**
   

### Updating Existing Dependencies

1. **Update version in requirements.in:**
   ```bash
   # Change from: langchain
   # To: langchain==0.4.0
   ```

2. **Build and regenerate:**
   ```bash
   # Navigate to Lambda directory and build
   cd cdk/lambda/case_generation
   docker build -t case-gen-image .
   
   # Regenerate requirements.txt
   docker run --rm -v ${PWD}:/app -w /app case-gen-image bash -c "
     pip install pip-tools && 
     pip-compile --upgrade requirements.in
   "
   ```

