FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for psycopg
RUN yum -y install postgresql-devel gcc libpq

RUN pip install psycopg2-binary

# Install pip-tools for dependency management
RUN pip install --no-cache-dir pip-tools

# Copy requirements.in instead of requirements.txt
COPY requirements.txt ${LAMBDA_TASK_ROOT}

RUN pip install --no-cache-dir -r requirements.txt

RUN pip list
    
# Copy the source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set the Lambda handler
CMD [ "main.handler" ]
