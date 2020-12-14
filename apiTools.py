import os
import sys

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from Tools import log

from dao import DAO
from definitions import DOMAIN_APPLI


def create_app(unity):
    """
    Initialisation de l'instance de serveur d'API
    :param test_config:
    :param port:
    :param db_server:
    :return:
    """

    if unity is None:
        log("Aucune monnaie par defaut, On en lance pas le server")
        return None

    app = Flask(__name__, static_folder="static", instance_relative_config=True)
    app.app_context().push()

    domain_server = "https://server.f80.fr"
    if "localhost" in sys.argv:
        app.config['TESTING'] = True
        domain_server = "http://localhost"
        domain_appli = "http://localhost:4200"
    else:
        domain_appli = DOMAIN_APPLI

    app.config["DOMAIN_SERVER"] = domain_server
    app.config["DOMAIN_APPLI"] = domain_appli
    app.config["unity"]=unity

    CORS(app)

    socketio = SocketIO(app, cors_allowed_origins="*", logger=False,ping_interval=50)

    app.logger.info("Ouverture de l'application")
    app.logger.setLevel(8)

    app.config.from_mapping(
        SECRET_KEY='secret!',
        ADMIN_PASSWORD="hh4271"
    )
    app.config["MONGODB_SETTINGS"] = {
        "db": "ticketshare",
        "username": "admin",
        "password": "hh4271",
        "port": 27017,
        "host": "mongodb://server.f80.fr/coinmaker",
        "authentication_source": "admin"
    }
    app.config['JSON_AS_ASCII'] = False
    app.config['tfc']=unity


    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # On retourne la version
    @app.route('/version')
    def version():
        return 'version 1.0'

    return app, socketio
