FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for psycopg2
RUN yum install -y \
    gcc \
    python3-devel \
    postgresql-devel \
    libpq-devel \
    make

# Upgrade pip and install pip-tools
RUN pip install --upgrade pip
RUN pip install pip-tools

# Copy and install requirements
COPY requirements.in ${LAMBDA_TASK_ROOT}
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

# DEBUG: Check psycopg2 and libpq are present
RUN pip show psycopg2-binary && find / -name "libpq.so*"

# Copy app code
COPY src/ ${LAMBDA_TASK_ROOT}

CMD [ "main.handler" ]
