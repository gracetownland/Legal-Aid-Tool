FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies with Amazon Linux extras
RUN amazon-linux-extras enable postgresql13 \
    && yum -y install postgresql-devel postgresql-libs gcc libpq gcc-c++ \
    && yum clean all \
    && rm -rf /var/cache/yum

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the *compiled* requirements.txt file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Install psycopg2 with specific build flags
RUN pip uninstall -y psycopg2 psycopg2-binary \
    && pip install --no-cache-dir psycopg2-binary==2.9.9

RUN pip list

# Copy source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set Lambda handler
CMD [ "main.handler" ]
