FROM public.ecr.aws/lambda/python:3.11

RUN yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm \
    && yum -y install postgresql15-libs postgresql15-devel gcc gcc-c++ \
    && yum clean all \
    && rm -rf /var/cache/yum

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the *compiled* requirements.txt file
# This assumes you've already generated requirements.txt using the separate Docker command
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Install psycopg2 
RUN pip install psycopg2

RUN pip list

# Copy source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set Lambda handler
CMD [ "main.handler" ]