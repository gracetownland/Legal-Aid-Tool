FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies needed by psycopg2-binary
RUN yum install -y \
    gcc \
    python3-devel \
    postgresql-devel \
    libpq-devel \
    make

# Upgrade pip and install pip-tools
RUN pip install --upgrade pip
RUN pip install --no-cache-dir pip-tools

# Copy requirements.in and install dependencies
COPY requirements.in ${LAMBDA_TASK_ROOT}
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set the handler
CMD [ "main.handler" ]
