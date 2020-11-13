#Voir https://github.com/erdDEVcode/erdnet/blob/master/Dockerfile

#fabrication: docker build -t f80hub/elrond-testnet . & docker push f80hub/elrond-testnet:latest
#installation: podman rm -f elrond-testnet && podman pull f80hub/elrond-testnet:latest && podman run --name elrond-testnet -p 7950:7950 -d f80hub/elrond-testnet:latest
#execution: docker run -v temp:c:/temp -p 9570:9570 -ti f80hub/elrond-testnet bash

FROM ubuntu:groovy
RUN apt update
RUN apt install -y wget python3 python3-venv sudo build-essential nano net-tools python3-pip
RUN adduser --home /home/erd --shell /bin/bash --disabled-password erd
RUN echo "erd     ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
USER erd

RUN wget -O ~/erdpy-up.py https://raw.githubusercontent.com/ElrondNetwork/elrond-sdk/master/erdpy-up.py
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

RUN ~/elrondsdk/erdpy testnet config

CMD ["bash"]
