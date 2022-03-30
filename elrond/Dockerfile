#Utiliser ERDPY depuis windows
#directement inspiré de https://github.com/erdDEVcode/erdnet/blob/master/Dockerfile


FROM elrondnetwork/elrond-sdk-erdpy-rust
#fabrication de l'image pour X86: docker build -t f80hub/elrond-dev . & docker push f80hub/elrond-dev:latest
#déploiement : docker rm -f elrond-dev && docker pull f80hub/elrond-dev:latest
#ligne de commande : docker rm -f elrond-dev && docker run --name elrond-dev -v C:/Users/hhoar/PycharmProjects/elMoney/elrond:/home/erd/dev/ -v c:/Users/hhoareau/PycharmProjects/elMoney/elrond:/home/erd/dev/ -ti f80hub/elrond-testnet bash
#ligne de commande :
# docker rm -f elrond-dev
# docker run --name elrond-dev -v C:/Users/hhoar/CLionProjects/ENFT:/home/elrond/tokenforge -ti f80hub/elrond-dev

USER root
RUN echo "elrond ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
RUN apt update
RUN apt install -y python3-pip
#RUN pip3 install erdpy==1.2.3

USER elrond

WORKDIR /home/elrond/tokenforge

CMD ["bash","source"]