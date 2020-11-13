import base64
import json
import os
import ssl
import sys
from time import sleep

from apscheduler.schedulers.background import BackgroundScheduler

import yaml
from erdpy.accounts import Account

from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from Tools import  log, send_mail, open_html_file, now, send
from apiTools import create_app

from dao import DAO
from definitions import DOMAIN_APPLI, MAIN_UNITY, CREDIT_FOR_NEWACCOUNT, APPNAME, XGLD_FOR_NEWACCOUNT, ADMIN_SALT, \
    MAIN_URL, DEFAULT_UNITY_CONTRACT, TOTAL_DEFAULT_UNITY
from elrondTools import ElrondNet



scheduler = BackgroundScheduler()









def init_cmk(bc,dao):
    """
    :return: l'adresse de la monnaie par defaut
    """
    cmk=DEFAULT_UNITY_CONTRACT
    if bc.bank is None:
        log("Vous devez initialiser la bank pour créer le contrat de monnaie par défaut")
        return False

    if len(cmk) == 0:
        log("Pas de monnaie dans la configuration, on en créé une")
        rc=bc.deploy(bc.bank, MAIN_UNITY, TOTAL_DEFAULT_UNITY)
        if "error" in rc:
            log("Impossible de déployer le contrat de la monnaie par defaut")
            return None

        cmk=rc["contract"]

    if dao.get_name(cmk) is None:
        dao.add_money(cmk,"CMK",bc.bank.address.bech32(),True,True,MAIN_URL)

    log("Contrat de la monnaie par defaut déployer à "+cmk)
    return cmk





bc = ElrondNet(proxy=sys.argv[2])
dao=DAO("./elmoney")
app, socketio = create_app(init_cmk(bc,dao))



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

    tx=bc.transfer(bc.contract,bc.bank,_to,CREDIT_FOR_NEWACCOUNT)
    sleep(3)

    bc.credit(bc.bank,_to,XGLD_FOR_NEWACCOUNT)
    sleep(3)
    log("Transfert de la monnaie de base sur le compte "+address)
    return jsonify({"address":address,"pem":body}),200



def refresh_client(dest:str):
    send(socketio,"refresh_account",dest)
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
        }), _to=dest, subject="Transfert",attach=pem_dest)
        dao.add_contact(email=dest,addr=_dest.address.bech32())
        sleep(5)
    else:
        _dest=Account(address=addr_dest)

    log("Demande de transfert vers "+_dest.address.bech32()+" de "+amount+" "+unity)

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

    log("Appel du smartcontract")
    rc=bc.transfer(contract,_from,_dest,int(amount))

    if not "error" in rc:
        log("Transfert effectué " + str(rc) + " programmation du rafraichissement des comptes")
        scheduler.add_job(refresh_client,id="id_"+rc["to"],args=[rc["to"]],trigger="interval",minutes=0.25,max_instances=1)
        scheduler.add_job(refresh_client,id="id_"+rc['from'].bech32(),args=[rc['from'].bech32()],trigger="interval",minutes=0.2,max_instances=1)
        return jsonify(rc),200
    else:
        log("Erreur lors du transfert "+str(rc))
        return jsonify(rc),500



@app.route('/api/deploy/<unity>/<amount>/',methods=["POST"])
def deploy(unity:str,amount:str,data:dict=None):
    log("Appel du service de déploiement de contrat pour "+unity)

    if data is None:
       data = str(request.data, encoding="utf-8")
       log("Les données de fabrication de la monnaie sont "+data)
       data = json.loads(data)

    log("Vérification de l'unicité du nom")
    if data["public"] and not dao.get_money_by_name(unity) is None:
        return jsonify({"message": "Cette monnaie 'public' existe déjà"}), 500

    if not ".pem" in data["pem"]:
        pem_file="./PEM/temp"+str(now()*1000)+".pem"
        log("Fabrication d'un fichier PEM pour la signature et enregistrement sur " + pem_file)
        with open(pem_file, "w") as file:file.write(data["pem"])
    else:
        pem_file="./PEM/"+data["pem"]

    owner=Account(pem_file=pem_file)
    log("Compte propriétaire de la monnaie créé. Lancement du déploiement de "+unity)
    result=bc.deploy(owner,unity,int(amount))
    if "error" in result:
        log("Probléme de création de la monnaie "+str(result))
        return jsonify(result), 500
    else:
        dao.add_money(result["contract"],unity,result["owner"],data["public"],data["transferable"],data["url"])

    #scheduler.add_job(refresh_client, id="id_" + owner, args=[owner], trigger="interval", minutes=0.15,max_instances=1)

    return jsonify(result),200



#http://localhost:5555/api/server_config/
@app.route('/api/server_config/')
def server_config():
    bank_balance=bc.getBalance(app.config["cmk"],bc.bank.address.bech32())
    infos={
        "bank_addr":bc.bank.address.bech32(),
        "bank_cmk":bank_balance["number"],
        "bank_gas": bank_balance["gas"],
        "default_money":app.config["cmk"],
        "proxy":bc._proxy.url
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

    if rc is None:
        return jsonify({"error":"impossible d'évaluer la balance de "}),200
    else:
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

    log("Création du compte " + _a.address.bech32() +". Demande de transfert de la monnaie par defaut")

    rc=bc.transfer(app.config["cmk"], bc.bank, _a, CREDIT_FOR_NEWACCOUNT)
    t=bc.wait_transaction(rc["tx"], not_equal="pending",timeout=5)

    log("Résultat du transfert "+str(t))

    #TODO: private key a crypter

    keys = {"public": _a.address.bech32(), "private": _a.private_key_seed}
    return jsonify({"address":_a.address.bech32(),"keys":keys,"pem":pem}),200



@app.route('/api/moneys/<addr>/')
def getmoneys(addr:str):
    log("Récépuration de l'ensemble des monnaies pour "+addr)
    rc=[]
    for row in dao.get_moneys(addr):
        rc.append({"contract":row[0],"unity":row[1],"public":row[3],"owner":row[4],"url":row[5]})
    return jsonify(rc)


#http://localhost:5555/api/raz/hh4271
@app.route('/api/raz/<password>/')
def raz(password:str):
    log("Demande d'effacement de la base")
    if password!="hh4271":return "Password incorrect",501
    if dao.raz():
        dao.add_money(app.config["cmk"], MAIN_UNITY, bc.bank.address.bech32(), True, True,MAIN_URL)

    return jsonify({"message":"Effacement terminé"}),200





@app.route('/api/name/<contract>/')
def getname(contract:str):
    rc=dao.get_name(contract)
    if rc is None:return "Pas de monnaie correspondant au contrat "+contract,404
    return jsonify({"name":rc}), 200





if __name__ == '__main__':

    # bc=ElrondNet(proxy="http://172.26.244.241:7950")
    # bc = ElrondNet(proxy="http://161.97.75.165:7950")

    _port=sys.argv[1]
    scheduler.start()

    if "debug" in sys.argv:
        socketio.run(app,host="0.0.0.0", port=_port, debug=True)
    else:
        if "ssl" in sys.argv:
            context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            context.load_cert_chain("/certs/fullchain.pem", "/certs/privkey.pem")
            socketio.run(app,host="0.0.0.0",  port=_port,debug=False, ssl_context=context)

        else:
            socketio.run(app,host="0.0.0.0",  port=_port,debug=False)


