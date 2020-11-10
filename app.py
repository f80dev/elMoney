import base64
import json
import ssl
import sys
from time import sleep

from apscheduler.schedulers.background import BackgroundScheduler

import yaml
from erdpy.accounts import Account

from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from Tools import base_10_to_alphabet, log, send_mail, open_html_file, now
from dao import DAO
from definitions import DOMAIN_APPLI, MAIN_UNITY, CREDIT_FOR_NEWACCOUNT, APPNAME, XGLD_FOR_NEWACCOUNT, ADMIN_SALT
from elrondTools import ElrondNet


#Initialisation des instances principales statics
app = Flask(__name__)
CORS(app)

bc=None
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


@app.route('/api/analyse_pem/',methods=["POST"])
def analyse_pem():
    body=str(request.data,"utf-8")
    if body.endswith(".pem"):
        _to=Account(pem_file="./PEM/"+body)
        address=_to.address.bech32()
    else:
        body=str(base64.b64decode(body.split("base64,")[1]),"utf-8")
        address="erd"+body.split("erd")[1].split("----")[0]
        _to=Account(address)

    tx=bc.transfer(bc._default_contract,bc.bank,_to,CREDIT_FOR_NEWACCOUNT)
    sleep(5)

    bc.credit(bc.bank,_to,XGLD_FOR_NEWACCOUNT)
    sleep(5)
    log("Transfert de la monnaie de base sur le compte "+address)
    return jsonify({"address":address,"pem":body}),200



def refresh_client(dest:str):
    send("refresh_account",dest)
    scheduler.remove_job("id_"+dest)



#test http://localhost:5000/api/transfer
@app.route('/api/transfer/<contract>/<dest>/<amount>/<unity>/',methods=["POST"])
def transfer(contract:str,dest:str,amount:str,unity:str):
    if "@" in dest:
        addr_dest=dao.find_contact(dest)
    else:
        addr_dest=dest

    if addr_dest is None:
        log("Le destinataire n'a pas encore d'adresse elrond")
        _dest,pem_dest=bc.create_account(XGLD_FOR_NEWACCOUNT)
        send_mail(open_html_file("share", {
            "email": dest,
            "amount": str(amount),
            "appname":APPNAME,
            "unity": unity.lower(),
            "url_appli": DOMAIN_APPLI + "?contract=" + contract + "&user=" + _dest.address.bech32(),
            "public_key": _dest.address.bech32(),
            "private_key": _dest.private_key_seed,
        }), _to=dest, subject="Transfert",files=[])
        dao.add_contact(email=dest,addr=_dest.address.bech32())
        sleep(5)
    else:
        _dest=Account(address=addr_dest)

    log("Demande de transfert vers "+_dest.address.bech32()+" de "+amount)

    #Préparation du _from
    if "BEGIN PRIVATE KEY" in str(request.data,"utf-8"):
        pem_file="./PEM/temp.pem"
        pem_body=json.loads(str(request.data, encoding="utf-8"))
        #TODO: a modifier car probleme en multi-user
        with open(pem_file, "w") as file:
            #TODO insérer ici le decryptage de la clé par le serveur
            file.write(pem_body["pem"])
            file.close()
        _from=Account(pem_file=pem_file)
    else:
        infos = json.loads(str(request.data, encoding="utf-8"))
        if infos["pem"]:
            _from = Account(pem_file="./PEM/"+infos["pem"])
        else:
            _from = Account(address=infos["public"])
            _from.private_key_seed=infos["private"]

    rc=bc.transfer(contract,_from,_dest,int(amount))

    scheduler.add_job(refresh_client,id="id_"+rc["to"],args=[rc["to"]],trigger="interval",minutes=0.25,max_instances=1)
    scheduler.add_job(refresh_client,id="id_"+rc['from'].bech32(),args=[rc['from'].bech32()],trigger="interval",minutes=0.2,max_instances=1)

    log("Transfert effectué "+str(rc))
    return jsonify({"from_addr":str(rc["from"].bech32()),"tx":rc["explorer"]}),201



@app.route('/api/deploy/<unity>/<amount>/',methods=["POST"])
def deploy(unity:str,amount:str,data:dict=None):
    log("Appel du service de déploiement de contrat")
    if data is None:
       data = str(request.data, encoding="utf-8")
       log("Les données de fabrication de la monnaie sont "+data)
       data = json.loads(data)

    if not "/PEM/" in data["pem"]:
        pem_file="./PEM/temp"+str(now())+".pem"
        log("Fabrication d'un fichier PEM pour la signature et enregistrement sur " + pem_file)
        with open(pem_file, "w") as file:file.write(data["pem"])
    else:
        pem_file=data["pem"]

    owner=Account(pem_file=pem_file)
    log("Compte propriétaire de la monnaie créé. Lancement du déploiement de "+unity)
    result=bc.deploy(owner,unity,int(amount))
    if "error" in result:
        log("Probléme de création de la monnaie "+str(result))
        return jsonify(result), 500
    else:
        dao.add_money(result["contract"],unity,result["owner"],data["public"],data["transferable"])

    return jsonify(result),201






@app.route('/api/infos_server/')
def infos_server():
    infos={
    }
    return jsonify(infos),200


@app.route('/api/contacts/<addr>/')
def get_contacts(addr:str):
    rows=dao.get_friends(addr)
    rc = []
    for row in rows:
        rc.append({"firstname": row[2], "email": row[1],"address":row[0]})
    return jsonify(rc)


@app.route('/api/find_contact/<email>/')
def find_contact(email:str):
    contact=dao.find_contact(email)
    return jsonify(contact),201



@app.route('/api/del_owner_contact/<email>/<owner>/',methods=["GET"])
def del_contact(email:str,owner:str):
    dao.del_contact(email,owner)
    return "contact supprimé",202


@app.route('/api/contacts/<owner>/',methods=["POST"])
def add_contact(owner:str):
    data=str(request.data,"utf-8")
    contact=json.loads(data)
    log("Ajout d'un contact avec les informations "+data)

    if dao.find_contact(contact["email"]) is None:
        dao.add_contact(contact["email"],contact["email"].split("@")[0])
        return "contact ajouté",201
    else:
        return "contact existant",201


#test http://localhost:5000/api/balance/erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx/
@app.route('/api/balance/<contract>/<addr>/')
def getbalance(contract:str,addr:str):
    name=dao.get_name(contract)
    if name is None:
        return jsonify({"error":"Pas de money correspondante à l'adresse "+addr}), 200
    else:
        log("La monnaie correspondant à l'adresse "+addr+" est "+name)

    rc = bc.getBalance(contract,addr)

    log("Balance de "+addr+" à "+str(rc)+name.lower()+" pour le contrat "+contract)
    return jsonify({"balance":rc["number"],"gas":str(rc["gas"]),"name":name}),200


@app.route('/api/getyaml/<name>/')
def getyaml(name):
    f=open("./static/"+name+".yaml","r",encoding="utf-8")
    rc=yaml.safe_load(f.read())
    return jsonify(rc),200


@app.route('/api/new_account/')
def new_account():
    _a,pem=bc.create_account(XGLD_FOR_NEWACCOUNT)

    log("Création du compte " + _a.address.bech32() +". Demande de transfert de fond")
    sleep(1)
    rc=bc.transfer(bc._default_contract, bc.bank, _a, CREDIT_FOR_NEWACCOUNT)
    log("Résultat du transfert "+str(rc))

    #TODO: private key a crypter

    keys = {"public": _a.address.bech32(), "private": _a.private_key_seed}
    return jsonify({"address":_a.address.bech32(),"keys":keys,"pem":pem}),200



@app.route('/api/moneys/<addr>/')
def getmoneys(addr:str):
    log("Récépuration de l'ensemble des monnaies pour "+addr)
    rc=[]
    for row in dao.get_moneys(addr):
        rc.append({"contract":row[0],"unity":row[1],"public":row[3],"owner":row[4]})
    return jsonify(rc)


#http://localhost:5555/api/raz/hh4271
@app.route('/api/raz/<password>/')
def raz(password:str):
    log("Demande d'effacement de la base")
    if password!="hh4271":return "Password incorrect",501
    if dao.raz():
        if bc.init_default_money():
            dao.add_money(bc._default_contract.address.bech32(), MAIN_UNITY, bc.bank.address.bech32(), True, True)

    return jsonify({"message":"Effacement terminé"}),200





@app.route('/api/name/<contract>/')
def getname(contract:str):
    rc=dao.get_name(contract)
    if rc is None:return "Pas de monnaie correspondant au contrat "+contract,404
    return jsonify({"name":rc}), 200






if __name__ == '__main__':
    _port=5555
    if len(sys.argv)>1:
        _port = sys.argv[1]

    if len(sys.argv)>2:
        # bc=ElrondNet(proxy="http://172.26.244.241:7950")
        #bc = ElrondNet(proxy="http://161.97.75.165:7950")
        bc=ElrondNet(proxy=sys.argv[2])
    else:
        bc=ElrondNet()

    log("Connexion sur le réseau elrond "+bc.environment.url)
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


