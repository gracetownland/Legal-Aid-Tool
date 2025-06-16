# Dockerfile.compile
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies needed for compiling numpy and psycopg[binary]
# This includes build-essential or its equivalents for Amazon Linux
RUN yum -y install postgresql-devel gcc gcc-c++ libpq \
    && yum clean all \
    && rm -rf /var/cache/yum

# Set up pip-tools (pip-compile needs to be installed)
RUN pip install --no-cache-dir pip-tools

# Set working directory
WORKDIR /app

# Copy requirements.in
COPY requirements.in .

# IMPORTANT: The following command will be run manually
# CMD ["pip-compile", "--output-file", "requirements.txt", "requirements.in"]