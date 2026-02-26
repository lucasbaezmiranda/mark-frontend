FROM public.ecr.aws/lambda/python:3.12

# Install C++ compiler and tools
RUN dnf install -y gcc-c++ make cmake wget tar

# Install Eigen Library
RUN wget https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.tar.gz && \
    tar -xf eigen-3.4.0.tar.gz && \
    cp -r eigen-3.4.0/Eigen /usr/local/include/ && \
    rm -rf eigen-3.4.0*

WORKDIR /build
COPY optimizer.cpp .

# Compile the binary statically linked where possible for maximum portability
RUN g++ -O3 -I /usr/local/include optimizer.cpp -o optimizer

# When the container runs, it just outputs the binary
CMD ["cat", "optimizer"]