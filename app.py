import base64
import json
import os
import ssl
import sys
import sqlite3
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

import yaml
from apscheduler.triggers.base import BaseTrigger

from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from Tools import base_10_to_alphabet, log
from dao import DAO
from elrondTools import ElrondNet


#Initialisation des instances principales statics
app = Flask(__name__)
CORS(app)
bc=ElrondNet()
socketio = SocketIO(app, cors_allowed_origins="*", logger=False,ping_interval=50)
scheduler = BackgroundScheduler()
dao=DAO("./elmoney")



def send(event_name: str, dest, message: str = "", param: dict = {}):
    if not type(dest)==list:dest=[dest]
    for d in dest:
        body = dict({'to': d, 'message': message, 'param': param})
        rc = socketio.emit(event_name, body, broadcast=True)
        log("WebSocket.send de " + event_name + " à " + d);
    return rc



@app.route('/api/events/<contract>/',methods=["GET"])
def event_loop(contract:str,dest:str,amount:str):
    bc.find_events(contract)



def refresh_client(dest:str):
    send("refresh_account",dest)
    scheduler.remove_job("id_"+dest)



#test http://localhost:5000/api/transfer
@app.route('/api/transfer/<contract>/<dest>/<amount>/',methods=["POST"])
def transfer(contract:str,dest:str,amount:str):
    log("Demande de transfert vers "+dest+" de "+amount)
    pem_body=str(base64.b64decode(str(request.data).split("base64,")[1]),encoding="utf-8")
    with open("./PEM/temp.pem", "w") as pem_file:pem_file.write(pem_body)

    bc.set_contract(contract)
    rc=bc.transfer("./PEM/temp.pem",dest,int(amount))

    if "to" in rc and "@" in dest:
        dao.add_contact(rc["from"],dest,rc["to"])

    scheduler.add_job(refresh_client,id="id_"+dest,args=[dest],trigger="interval",minutes=0.25,max_instances=1)
    scheduler.add_job(refresh_client,id="id_"+dest,args=[rc['from'].bech32()],trigger="interval",minutes=0.2,max_instances=1)

    os.remove("./PEM/temp.pem")
    url="https://testnet-explorer.elrond.com/transactions/"+rc["tx"]
    return jsonify({"from_addr":str(rc["from"].bech32()),
                    "tx":url})



@app.route('/api/deploy/<unity>/<amount>/',methods=["POST"])
def deploy(unity:str,amount:str,data:dict=None):
    log("Appel du service de déploiement de contrat")
    if data is None:
       data = str(request.data, encoding="utf-8")
       data = json.loads(data)

    if not "/PEM/" in data["pem"]:
        if "base64" in data["pem"]: data["pem"] = data["pem"].split("base64,")[1]
        pem_body = str(base64.b64decode(data["pem"]), encoding="utf-8")
        pem_file="./PEM/temp.pem"
        with open(pem_file, "w") as file:file.write(pem_body)
    else:
        pem_file=data["pem"]

    result=bc.deploy("./static/deploy.json",pem_file,unity,int(amount))
    if "error" in result:
        return jsonify(result), 500
    else:
        dao.add_money(result["contract"],unity,result["owner"],data["public"],data["transferable"])

    return jsonify(result),200


def get_name(contract):
    name=dao.get_name(contract)
    if name is None:return "Contrat inconnu",404
    log("Nom de la monnaie sur " + contract + " à " + name)
    return jsonify({"name":name}),200




@app.route('/api/friends/<addr>/')
def friends(addr:str):
    rows=dao.get_friends(addr)
    if len(rows) == 0: return "Aucun ami",404
    rc = []
    for row in rows:
        rc.append({"firstname": row[2], "email": row[1],"address":row[0]})
    return jsonify(rc)


#test http://localhost:5000/api/balance/erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx/
@app.route('/api/balance/<contract>/<addr>/')
def getbalance(contract:str,addr:str):
    name=get_name(contract)
    if name is None:return "Pas de money correspondante", 404

    bc.set_contract(contract)
    rc = bc.getBalance(addr)

    log("Balance de "+addr+" à "+str(rc)+name+" pour le contrat "+contract)
    return jsonify({"balance":rc,"name":name}),200


@app.route('/api/getyaml/<name>/')
def getyaml(name):
    f=open("./static/"+name+".yaml","r")
    rc=yaml.safe_load(f.read())
    return jsonify(rc),200


@app.route('/api/new_account/')
def new_account():
    rc=bc.create_account(1)
    rc["account"]=None
    return jsonify(rc),200



@app.route('/api/moneys/<addr>')
def getmoneys(addr:str):
    rc=[]
    for row in dao.get_moneys(addr):
        rc.append({"contract":row[0],"unity":row[1],"public":row[3],"owner":row[4]})
    return jsonify(rc)


#http://localhost:5555/api/raz/hh4271
@app.route('/api/raz/<password>')
def raz(password:str):
    if password!="hh4271":return "Password incorrect",501
    if dao.raz():
        rc=deploy("CMK","10000",dict(
            {"pem":"./PEM/admin.pem",
             "public":True,
             "transferable":True}
        ))
        if "error" in rc:
            return "Probleme dans la création de la monnaie par défaut",501

    return "Effacement terminé",200





@app.route('/api/name/<contract>/')
def getname(contract:str):
    rc=get_name(contract)
    if rc is None:return "Pas de monnaie correspondant à ce contrat",404
    return jsonify({"name":rc}), 200






if __name__ == '__main__':
    _port=5555
    if len(sys.argv)>2:
        _port = sys.argv[1]

    scheduler.start()

    if "debug" in sys.argv:
        app.run(host="0.0.0.0", port=_port, debug=True)
    else:
        if "ssl" in sys.argv:
            context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            context.load_cert_chain("/certs/fullchain.pem", "/certs/privkey.pem")
            app.run(host="0.0.0.0", port=_port, debug=False, ssl_context=context)
        else:
            app.run(host="0.0.0.0", port=_port, debug=False)


