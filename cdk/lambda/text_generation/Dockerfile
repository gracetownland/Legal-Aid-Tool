FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies
RUN yum install -y \
    gcc \
    python3-devel \
    postgresql15 \
    postgresql15-devel \
    postgresql15-libs \
    make

# Symlink libpq where Lambda runtime expects it
RUN ln -sf /usr/pgsql-15/lib/libpq.so.5 /lib64/libpq.so.5

# Upgrade pip and install pip-tools
RUN pip install --upgrade pip
RUN pip install pip-tools

# Install Python dependencies
COPY requirements.in .
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set handler
CMD ["main.handler"]
