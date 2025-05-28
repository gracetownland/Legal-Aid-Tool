FROM public.ecr.aws/lambda/python:3.11

RUN yum install -y \
    gcc \
    python3-devel \
    postgresql-devel \
    libpq-devel \
    make

# 2. Upgrade pip + install pip-tools
RUN pip install --upgrade pip
RUN pip install pip-tools

# 3. Copy and install dependencies
COPY requirements.in ${LAMBDA_TASK_ROOT}
# Compile and install dependencies
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

RUN pip list


# Copy the rest of the code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD [ "main.handler" ]
