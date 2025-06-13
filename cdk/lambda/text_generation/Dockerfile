FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for psycopg etc.
RUN yum -y install postgresql-devel gcc libpq

# Install pip-tools for dependency management
RUN pip install --no-cache-dir pip-tools

# Copy requirements.in
COPY requirements.in ${LAMBDA_TASK_ROOT}

# Compile and install dependencies
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

# Copy your actual source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set the handler
CMD [ "main.handler" ]
