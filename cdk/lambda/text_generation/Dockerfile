FROM public.ecr.aws/lambda/python:3.11

# 1. Install build tools and PostgreSQL client headers
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
COPY requirements.in .
RUN pip-compile requirements.in
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy your application code
COPY . .

# Set the CMD if you're using a Lambda handler
CMD ["main.handler"]
