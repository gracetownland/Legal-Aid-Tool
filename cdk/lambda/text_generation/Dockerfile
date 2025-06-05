FROM public.ecr.aws/lambda/python:3.11

RUN yum install -y \
    gcc \
    python3-devel \
    libpq-devel

RUN pip install --upgrade pip
RUN pip install pip-tools

COPY requirements.in ${LAMBDA_TASK_ROOT}
WORKDIR ${LAMBDA_TASK_ROOT}
RUN pip-compile requirements.in && \
    pip install --no-cache-dir -r requirements.txt

RUN pip list

COPY src/ ${LAMBDA_TASK_ROOT}

CMD [ "main.handler" ]
