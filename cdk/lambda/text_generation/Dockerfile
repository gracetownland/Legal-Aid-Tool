FROM public.ecr.aws/lambda/python:3.11

# Install PostgreSQL development libraries and debugging tools
RUN yum install -y \
    gcc \
    python3-devel \
    postgresql-devel \
    postgresql-libs \
    findutils \
    which

# Copy requirements.in file
COPY requirements.in ${LAMBDA_TASK_ROOT}

# Install psycopg2 with specific build flags
RUN pip install --upgrade pip && \
    pip install --no-binary :all: psycopg2 && \
    pip install -r ${LAMBDA_TASK_ROOT}/requirements.in

# Create symbolic links to ensure libraries are found
RUN mkdir -p /opt/lib && \
    cp -P /usr/lib64/libpq.so* /opt/lib/ && \
    cp -P /usr/lib64/libldap*.so* /opt/lib/ && \
    cp -P /usr/lib64/liblber*.so* /opt/lib/ && \
    cp -P /usr/lib64/libsasl*.so* /opt/lib/ && \
    cp -P /usr/lib64/libssl*.so* /opt/lib/ && \
    cp -P /usr/lib64/libcrypto*.so* /opt/lib/

# Set LD_LIBRARY_PATH to include our libraries
ENV LD_LIBRARY_PATH=/opt/lib:$LD_LIBRARY_PATH

# Add debug information
RUN echo "Installed Python packages:" && \
    pip list && \
    echo "PostgreSQL libraries:" && \
    find /usr/lib64 -name "libpq*" && \
    find /opt/lib -name "libpq*" && \
    echo "LD_LIBRARY_PATH: $LD_LIBRARY_PATH"

# Copy the source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Lambda handler
CMD [ "main.handler" ]
