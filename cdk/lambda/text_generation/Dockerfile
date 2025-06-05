FROM public.ecr.aws/lambda/python:3.11

# Install required system libraries
RUN yum install -y \
    gcc \
    python3-devel \
    make \
    postgresql15 \
    postgresql15-devel \
    postgresql15-libs

# Upgrade pip + install pip-tools
RUN pip install --upgrade pip
RUN pip install pip-tools

# Copy and install dependencies
COPY requirements.in ${LAMBDA_TASK_ROOT}
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

RUN pip list

# Copy source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Lambda entrypoint
CMD ["main.handler"]
