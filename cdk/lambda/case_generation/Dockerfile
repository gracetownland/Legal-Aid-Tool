FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for psycopg[binary] and build tools for numpy
RUN yum -y install postgresql-devel gcc libpq gcc-c++ \
    && yum clean all \
    && rm -rf /var/cache/yum # Clean up yum cache to keep image size down

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the *compiled* requirements.txt file
# This assumes you've already generated requirements.txt using the separate Docker command
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Install psycopg2 
RUN pip install psycopg2

# Show installed packages (optional, for debugging)
RUN pip list

# Copy source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set Lambda handler
CMD [ "main.handler" ]