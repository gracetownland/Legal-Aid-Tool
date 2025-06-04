FROM public.ecr.aws/lambda/python:3.11

# 1. Install system dependencies (and clean up cache)
RUN yum install -y \
    gcc \
    python3-devel \
    postgresql-devel \
    libpq-devel \
    make && \
    yum clean all

# 2. Upgrade pip + install pip-tools
RUN pip install --upgrade pip
RUN pip install pip-tools

# 3. Copy and compile requirements
COPY requirements.in ${LAMBDA_TASK_ROOT}
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

RUN echo "📦 Installed packages:" && pip list

# 5. Copy the application code
COPY src/ ${LAMBDA_TASK_ROOT}

# 6. Set the Lambda handler
CMD [ "main.handler" ]
