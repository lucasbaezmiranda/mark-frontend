# Usamos el SO real de Lambda pero sin restricciones de entrypoint
FROM amazonlinux:2023

# Instalar herramientas de compilación
RUN dnf install -y gcc-c++ make cmake wget tar

# Instalar Eigen
RUN wget https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.tar.gz && \
    tar -xf eigen-3.4.0.tar.gz && \
    cp -r eigen-3.4.0/Eigen /usr/local/include/ && \
    rm -rf eigen-3.4.0*

WORKDIR /build
COPY optimizer.cpp .

# Compilar el binario
RUN g++ -O3 -I /usr/local/include optimizer.cpp -o optimizer

# No necesitamos CMD ni ENTRYPOINT, solo dejaremos el archivo ahí