#Utiliser ERDPY depuis windows
#directement inspiré de https://github.com/erdDEVcode/erdnet/blob/master/Dockerfile

FROM ubuntu:groovy
#fabrication de l'image pour X86: docker build -t f80hub/elrond-dev . & docker push f80hub/elrond-dev:latest
#déploiement : docker rm -f elrond-dev && docker pull f80hub/elrond-dev:latest
#ligne de commande : docker rm -f elrond-dev && docker run --name elrond-dev -v c:/Users/hhoareau/PycharmProjects/elMoney/elrond:/home/erd/dev/ -ti f80hub/elrond-testnet bash

RUN apt update
RUN apt install -y wget python3 python3-venv sudo build-essential nano net-tools python3-pip
RUN adduser --home /home/erd --shell /bin/bash --disabled-password erd
RUN echo "erd ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
USER erd

RUN wget -O ~/erdpy-up.py https://raw.githubusercontent.com/ElrondNetwork/elrond-sdk/master/erdpy-up.py --no-check-certificate
RUN python3 ~/erdpy-up.py
#RUN source ~/elrondsdk/erdpy-activate

ENV PATH="/home/erd/elrondsdk/:${PATH}"
RUN pip install erdpy==1.0.7

WORKDIR /home/erd/dev

CMD ["bash","source","/home/erd/elrondsdk/erdpy-activate"]
