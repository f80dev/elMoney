#fabrication: docker build -t f80hub/elrond-testnet . & docker push f80hub/elrond-testnet:latest
#installation: podman rm -f elrond-testnet && podman pull f80hub/elrond-testnet:latest && podman run --name elrond-testnet -p 7950:7950 -d f80hub/elrond-testnet:latest


FROM python:3.9.0-buster

RUN wget -O erdpy-up.py https://raw.githubusercontent.com/ElrondNetwork/elrond-sdk/master/erdpy-up.py
RUN python3 erdpy-up.py

RUN pip3 install --user --upgrade --no-cache-dir erdpy

RUN export PATH="$HOME/.local/bin:$PATH"

RUN erdpy config set dependencies.elrond_proxy_go.tag master
RUN erdpy config set dependencies.elrond_go.tag master
RUN erdpy testnet prerequisites

EXPOSE 7950

RUN erdpy config set chainID local-testnet
RUN erdpy config set proxy http://localhost:7950

