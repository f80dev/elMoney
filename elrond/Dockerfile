#Voir https://github.com/erdDEVcode/erdnet/blob/master/Dockerfile

#Lancement de la commande de base
#podman run --rm -d -p 127.0.0.1:7950:7950 hiddentao/erdnet:latest

#fabrication: docker build -t f80hub/elrond-testnet . & docker push f80hub/elrond-testnet:latest
#installation: podman rm -f elrond-testnet && podman pull f80hub/elrond-testnet:latest && podman run --name elrond-testnet -p 7950:7950 -d f80hub/elrond-testnet:latest bash
#execution: docker run -v temp:c:/temp -p 9570:9570 -ti f80hub/elrond-testnet bash
#test erdpy tx new --recall-nonce --data="Hello, World" --gas-limit=70000 --receiver=erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx --pem=./PEM/alice.pem --send

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
EXPOSE 7950

COPY testnet.sh /home/erd/sandbox


CMD ["source","testnet.sh"]

