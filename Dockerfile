FROM python:3.9.0-buster

#fabrication: docker build -t f80hub/elmoney . & docker push f80hub/elmoney:latest
#installation: docker rm -f elmoney && docker pull f80hub/elmoney:latest && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN pip3 -v install Flask
RUN pip3 -v install Flask-Cors
RUN pip3 -v install pyyaml

RUN pip3 install --upgrade pip setuptools wheel
RUN pip3 install pynacl
RUN pip3 install pycryptodome

RUN export PATH="$HOME/.local/bin:$PATH"
RUN pip3 install --user --upgrade --no-cache-dir erdpy
RUN pip3 install pyopenssl

RUN pip3 -v install apscheduler
RUN pip3 -v install flask-socketio
RUN pip3 -v install pymongo

WORKDIR /
RUN mkdir PEM
RUN mkdir static
VOLUME /certs

COPY *.py $APP_HOME/
COPY ./static $APP_HOME/static
COPY ./PEM $APP_HOME/PEM


EXPOSE 5555

#CMD ["python3", "app.py","5555","https://api-testnet.elrond.com","ssl"]
CMD ["python3", "app.py","5555","http://161.97.75.165:7590","ssl"]
