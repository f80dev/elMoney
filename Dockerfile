FROM f80hub/scientist_python_server_x86

#fabrication: docker build -t f80hub/elmoney . & docker push f80hub/elmoney:latest
#installation: docker rm -f elmoney && docker pull f80hub/elmoney:latest && docker run --restart=always -v /root/certs:/certs -p 8000:8000 --name elmoney -d f80hub/elmoney:latest

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apk update && apk add postgresql-dev gcc python3-dev musl-dev

RUN pip3 install flask
RUN pip3 install erdpy

RUN mkdir PEM

COPY *.py $APP_HOME/
COPY ./PEM $APP_HOME/PEM

EXPOSE 8000

CMD ["python3", "app.py"]

