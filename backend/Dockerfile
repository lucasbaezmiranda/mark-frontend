# Stage 1: Compilador
FROM amazonlinux:2023 AS builder
RUN dnf install -y gcc-c++ make cmake wget tar gzip
RUN wget https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.tar.gz && \
    tar -xf eigen-3.4.0.tar.gz && cp -r eigen-3.4.0/Eigen /usr/local/include/
WORKDIR /build
COPY optimizer.cpp .
RUN g++ -O3 -I /usr/local/include optimizer.cpp -o optimizer

# Stage 2: Runtime de Lambda
FROM public.ecr.aws/lambda/python:3.12
# Instalamos pandas y numpy aquí mismo. ¡Sin miedo al peso!
RUN pip install pandas numpy boto3
# Copiamos el código y el binario desde el builder
WORKDIR ${LAMBDA_TASK_ROOT}
COPY app.py .
COPY --from=builder /build/optimizer .
RUN chmod +x optimizer

CMD [ "app.lambda_handler" ]