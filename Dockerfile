FROM python:3.8.2-alpine

#fabrication: docker build -t f80hub/elmoney . & docker push f80hub/elmoney:latest
#installation: docker rm -f elmoney && docker pull f80hub/elmoney:latest && docker run --restart=always -v /root/certs:/certs -p 8000:8000 --name elmoney -d f80hub/elmoney:latest

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apk add gcc
RUN apk --no-cache --update-cache add python3-dev musl-dev
RUN pip3 install --upgrade pip setuptools
RUN pip3 -v install Flask
RUN pip3 -v install flask-socketio
RUN pip3 -v install Flask-Cors
RUN pip3 -v install pyyaml
RUN pip3 -v install pyqrcode
RUN pip3 -v install pypng
RUN pip3 -v install dnspython
RUN pip3 install erdpy

RUN echo "http://dl-8.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN echo "http://dl-8.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories
RUN echo "@testing http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN apk --update add --no-cache g++
RUN apk add --update --no-cache py3-numpy
RUN pip3 -v install pandas

RUN pip3 -v install openpyxl

WORKDIR /
RUN mkdir PEM
RUN mkdir static

COPY *.py $APP_HOME/
COPY ./PEM $APP_HOME/PEM

VOLUME /certs

EXPOSE 8000

CMD ["python3", "app.py"]

