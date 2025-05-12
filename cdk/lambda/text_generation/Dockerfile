FROM public.ecr.aws/lambda/python:3.11

LABEL maintainer="UBC Law" \
      module="textGeneration" \
      version="1.0.0" \
      environment="dev" \
      description="Text generation Lambda function for Legal Aid Tool"

# Install system dependencies
RUN yum -y install postgresql-devel gcc libpq

# Install pip-tools first
RUN pip install --no-cache-dir pip-tools

# Copy requirements.in
COPY requirements.in ${LAMBDA_TASK_ROOT}

# Compile and install dependencies
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD [ "main.handler" ]
