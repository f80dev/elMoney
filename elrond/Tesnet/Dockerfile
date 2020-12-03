#Déployer le testnet elrond sur serveur linuex
#directement inspiré de https://github.com/erdDEVcode/erdnet/blob/master/Dockerfile

FROM ubuntu:groovy
#fabrication de l'image pour X86: docker build -t f80hub/elrond-testnet . & docker push f80hub/elrond-testnet:latest
#déploiement : docker rm -f elrond-testnet && docker pull f80hub/elrond-testnet:latest
#execution : docker rm -f elrond-testnet && docker run --name elrond-testnet -p 7950:7950 -ti f80hub/elrond-testnet
#ligne de commande : docker rm -f elrond-testnet && docker run --name elrond-testnet -p 7950:7950 -ti f80hub/elrond-testnet bash

#FROM arm32v7/ubuntu
#fabrication ARM: docker build -t f80hub/elrond-testnet-arm . & docker push f80hub/elrond-testnet-arm:latest
#execution: docker rm -f elrond-testnet-arm && docker run --name elrond-testnet-arm -p 127.0.0.1:7950:7950 -ti f80hub/elrond-testnet-arm bash "/home/erd/sandbox/testnet.sh"

RUN apt update
RUN apt install -y wget python3 python3-venv sudo build-essential nano net-tools python3-pip
RUN adduser --home /home/erd --shell /bin/bash --disabled-password erd
RUN echo "erd     ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
USER erd

RUN wget -O ~/erdpy-up.py https://raw.githubusercontent.com/ElrondNetwork/elrond-sdk/master/erdpy-up.py --no-check-certificate
RUN python3 ~/erdpy-up.py

RUN pip install erdpy

RUN ~/elrondsdk/erdpy config set dependencies.elrond_proxy_go.tag master
RUN ~/elrondsdk/erdpy config set dependencies.elrond_go.tag master
RUN ~/elrondsdk/erdpy testnet prerequisites
RUN ~/elrondsdk/erdpy config set chainID local-testnet
RUN ~/elrondsdk/erdpy config set proxy http://0.0.0.0:7950

RUN mkdir ~/sandbox
RUN echo "[network]\nport_proxy=7950" > ~/sandbox/testnet.toml

WORKDIR /home/erd/sandbox
EXPOSE 7950

RUN echo "~/elrondsdk/erdpy testnet config\n~/elrondsdk/erdpy testnet start\n" > ~/sandbox/testnet.sh
RUN chmod +x /home/erd/sandbox/testnet.sh

COPY . /home/erd/sandbox
COPY ./PEM /home/erd/sandbox/PEM

CMD ["bash","/home/erd/sandbox/testnet.sh"]