FROM public.ecr.aws/lambda/python:3.11

# Install libpq with full header support for psycopg v3 (psycopg[binary])
RUN yum install -y \
    gcc \
    python3-devel \
    postgresql15-devel \
    libpq-devel \
    make

# Upgrade pip and install pip-tools
RUN pip install --upgrade pip
RUN pip install pip-tools

# Copy and install dependencies
COPY requirements.in ${LAMBDA_TASK_ROOT}
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Lambda handler
CMD [ "main.handler" ]
