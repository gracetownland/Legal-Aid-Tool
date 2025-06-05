FROM public.ecr.aws/lambda/python:3.11

# Install PostgreSQL development libraries
RUN yum install -y \
    gcc \
    python3-devel \
    postgresql-devel

# Copy requirements.in file
COPY requirements.in ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install --upgrade pip && \
    pip install psycopg2-binary && \
    pip install -r ${LAMBDA_TASK_ROOT}/requirements.in

# Copy the source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Lambda handler
CMD [ "main.handler" ]
