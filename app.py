import base64
import json
import ssl
import sys


from apscheduler.schedulers.background import BackgroundScheduler

import yaml
from bson import json_util
from erdpy.accounts import Account

from flask import  Response, request, jsonify


from Tools import  log, send_mail, open_html_file, now, send
from apiTools import create_app

from dao import DAO
from definitions import DOMAIN_APPLI, MAIN_UNITY, CREDIT_FOR_NEWACCOUNT, APPNAME, XGLD_FOR_NEWACCOUNT, \
    MAIN_URL, TOTAL_DEFAULT_UNITY, SIGNATURE, MAIN_DEVISE, TESTNET_EXPLORER, \
    ERC20_BYTECODE_PATH, NFT_CONTRACT, NFT_ADMIN, DEFAULT_CMK_CONTRACT
from elrondTools import ElrondNet



scheduler = BackgroundScheduler()




def init_cmk(bc,dao):
    """
    :return: l'adresse de la monnaie par defaut
    """
    if bc.bank is None:
        log("Vous devez initialiser la bank pour créer le contrat de monnaie par défaut")
        return False

    _m=dao.get_money_by_name(MAIN_UNITY,bc._proxy.url)
    if not _m is None:
        cmk=_m["addr"]
        _cmk=bc.getBalance(cmk,bc.bank)
        if "error" in _cmk:
            log("Le contrat de "+MAIN_UNITY+" n'est pas valable")
            cmk=""
    else:
        cmk = ""

    if len(cmk) == 0:
        if len(DEFAULT_CMK_CONTRACT)==0:
            log("Pas de monnaie dans la configuration, on en créé une")
            rc=bc.deploy(bc.bank, MAIN_UNITY, ERC20_BYTECODE_PATH,TOTAL_DEFAULT_UNITY)
            if "error" in rc:
                log("Impossible de déployer le contrat de la monnaie par defaut")
                return None
        else:
            rc={"contract":DEFAULT_CMK_CONTRACT}


        cmk=rc["contract"]

    if dao.get_money_by_address(cmk) is None:
        dao.add_money(cmk,MAIN_UNITY,bc.bank.address.bech32(),True,True,MAIN_URL,bc._proxy.url)

    log("Contrat de la monnaie par defaut déployer à "+cmk)
    return cmk



#Paramétres en ligne de commande
#1=port du serveur
#2=adresse du proxy de la blockchain
#3=nom de la base de données

bc = ElrondNet(proxy=sys.argv[2])
dao=DAO("server",sys.argv[3])
app, socketio = create_app(init_cmk(bc,dao))



@app.route('/api/events/<contract>/',methods=["GET"])
def event_loop(contract:str,dest:str,amount:str):
    bc.find_events(contract)


@app.route('/api/analyse_pem/',methods=["POST"])
def analyse_pem():
    body=str(request.data,"utf-8")
    log("Analyse du fichier PEM " + body)

    if body.endswith(".pem"):
        _to=Account(pem_file="./PEM/"+body)
        address=_to.address.bech32()
    else:
        body=str(base64.b64decode(body.split("base64,")[1]),"utf-8")
        address="erd"+body.split("erd")[1].split("----")[0]
        _to=Account(address)

    _cmk=dao.get_money_by_name(MAIN_UNITY,bc._proxy.url)

    return jsonify({"address":address,"pem":body}),200



def refresh_client(dest:str):
    send(socketio,"refresh_account",dest)
    scheduler.remove_job("id_"+dest)




@app.route('/api/refund/<dest>/',methods=["GET"])
def refund(dest:str):
    _dest=Account(dest)
    if not "elrond" in bc._proxy.url:
        amount=XGLD_FOR_NEWACCOUNT+"0"
    else:
        amount=XGLD_FOR_NEWACCOUNT

    if bc.credit(bc.bank,_dest,amount):
        account=bc._proxy.get_account_balance(_dest.address)
        return jsonify({"gas":account}),200
    else:
        return Response("probleme de rechargement",500)



#test http://localhost:5000/api/transfer
@app.route('/api/transfer/<contract>/<dest>/<amount>/<unity>/',methods=["POST"])
def transfer(contract:str,dest:str,amount:str,unity:str):
    addr_dest=None
    if "@" in dest:
        _u=dao.find_contact(dest)
        if not _u is None: addr_dest=_u["addr"]
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
            "signature": SIGNATURE
        }), _to=dest, subject="Transfert",attach=pem_dest)
        dao.add_contact(email=dest,addr=_dest.address.bech32())
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
        scheduler.add_job(refresh_client,id="id_"+rc["to"],args=[rc["to"]],trigger="interval",minutes=0.2,max_instances=1)
        scheduler.add_job(refresh_client,id="id_"+rc['from'],args=[rc['from']],trigger="interval",minutes=0.1,max_instances=1)
        return jsonify(rc),200
    else:
        log("Erreur lors du transfert "+str(rc))
        return jsonify(rc),500



def get_pem_file(data):
    """
    Fabrique ou recupere un pemfile
    :param data:
    :return:
    """
    if not "pem" in data:
        rc="./PEM/admin.pem"
    else:
        if not ".pem" in data["pem"]:
            rc="./PEM/temp"+str(now()*1000)+".pem"
            log("Fabrication d'un fichier PEM pour la signature et enregistrement sur " + rc)
            with open(rc, "w") as file:file.write(data["pem"])
        else:
            rc="./PEM/"+data["pem"]


    return rc



#http://localhost:6660/api/nfts/
@app.route('/api/evalprice/<sender>/<data>/<value>/',methods=["GET"])
def evalprice(sender,data="",value=0):
    rc=bc.evalprice(sender,NFT_CONTRACT,value,data)
    return jsonify(rc)



@app.route('/api/burn/<token_id>/',methods=["GET"])
def burn(token_id,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file = get_pem_file(data)
    rc=bc.burn(pem_file,token_id)
    return jsonify(rc)




#http://localhost:6660/api/nfts/
@app.route('/api/nfts/',methods=["GET"])
def nfts():
    rc=[]
    for uri in bc.get_uris(NFT_CONTRACT):
        rc.append(uri)
    return jsonify(rc),200




@app.route('/api/open_nft/<token_id>/',methods=["POST"])
def open_nft(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file = get_pem_file(data)
    tx = bc.nft_open(NFT_CONTRACT, pem_file, token_id)
    if "scResults" in tx:
        rc=str(base64.b64decode(tx["scResults"][0]["data"]))[3:]
        if "@" in rc:rc=rc.split("@")[1]
        rc=str(bytearray.fromhex(rc[0:len(rc)-1]),"utf-8")
    else:
        rc="Impossible d'ouvrir le token"
    return jsonify({"response":rc,"cost":tx["cost"]})


@app.route('/api/state_nft/<token_id>/<state>/',methods=["POST"])
def state_nft(token_id:str,state:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file = get_pem_file(data)
    tx = bc.set_state(NFT_CONTRACT, pem_file, token_id,state)
    send(socketio,"refresh_nft")
    return jsonify(tx),200




#http://localhost:6660/api/test/
@app.route('/api/test/',methods=["GET"])
def test():
    rc=bc.check_contract(NFT_CONTRACT)
    return jsonify(rc),200




@app.route('/api/buy_nft/<token_id>/<price>/',methods=["POST"])
def buy_nft(token_id,price,data:dict=None):
    if data is None:
       data = json.loads(str(request.data, encoding="utf-8"))

    pem_file=get_pem_file(data)
    rc=bc.nft_buy(NFT_CONTRACT,pem_file,token_id,float(price))
    send(socketio,"refresh_nft")
    return jsonify(rc)




#http://localhost:5555/api/mint/
@app.route('/api/mint/<count>/',methods=["POST"])
def mint(count:str,data:dict=None):
    log("Appel du service de déploiement de contrat NFT")

    if data is None:
        data = str(request.data, encoding="utf-8")
        log("Les données de fabrication sont " + data)
        data = json.loads(data)

    owner = Account(pem_file=get_pem_file(data))
    nft_contract_owner=Account(pem_file="./PEM/"+NFT_ADMIN+".pem")
    uri=data["signature"]
    secret=data["secret"]
    price = int(float(data["price"]) * 1e18)
    #TODO: ajouter ici un encodage du secret dont la clé est connu par le contrat

    arguments=[int(count), "0x"+owner.address.hex(),"0x"+uri.encode().hex(),"0x"+secret.encode().hex(),price]
    result=bc.mint(NFT_CONTRACT,nft_contract_owner,arguments)
    return jsonify({"tx":result}), 200





@app.route('/api/owner_of/<contract>/<token>/',methods=["GET"])
def owner_of(contract,token):
    rc=bc.owner_of(contract,token)
    return jsonify(rc),200





@app.route('/api/deploy/<unity>/<amount>/',methods=["POST"])
def deploy(unity:str,amount:str,data:dict=None):
    log("Appel du service de déploiement de contrat ERC20 pour "+unity)

    if data is None:
       data = str(request.data, encoding="utf-8")
       log("Les données de fabrication de la monnaie sont "+data)
       data = json.loads(data)

    log("Vérification de l'unicité du nom")
    if data["public"] and not dao.get_money_by_name(unity,bc._proxy.url) is None:
        return jsonify({"message": "Cette monnaie 'public' existe déjà"}), 500

    pem_file=get_pem_file(data)

    owner=Account(pem_file=pem_file)
    log("Compte propriétaire de la monnaie créé. Lancement du déploiement de "+unity)
    result=bc.deploy(owner,unity,ERC20_BYTECODE_PATH,amount)
    if "error" in result:
        log("Probléme de création de la monnaie "+str(result))
        return jsonify(result), 500
    else:
        send_mail(open_html_file("money",{
            "contract":result["contract"],
            "unity":unity,
            "appname":APPNAME,
            "devise":MAIN_DEVISE,
            "link":result["link"],
            "bill":result["cost"],
            "amount":str(amount),
            "signature":SIGNATURE,
        }),_to=data["email"],subject="Confirmation de création du "+unity)
        dao.add_money(result["contract"],unity,result["owner"],data["public"],data["transferable"],data["url"],bc._proxy.url)

    return jsonify(result),200



#http://localhost:5555/api/server_config/
@app.route('/api/server_config/')
def server_config():
    log("Récupération de la configuration du server avec la bank "+bc.bank.address.bech32())

    _cmk=dao.get_money_by_name(MAIN_UNITY,bc._proxy.url)
    if _cmk is None:
        _cmk=app.config["cmk"]
        log("Pas de monnaie disponible, on charge celle du fichier de config " + str(_cmk))
    else:
        _cmk = _cmk["addr"]

    bank_balance=bc.getBalance(_cmk,bc.bank.address.bech32())
    if not "error" in bank_balance:
        infos={
            "bank_addr":bc.bank.address.bech32(),
            "bank_cmk":bank_balance["number"],
            "bank_gas": bank_balance["gas"],
            "default_money":app.config["cmk"],
            "proxy":bc._proxy.url,
            "nft_contract":NFT_CONTRACT
        }
        return jsonify(infos),200
    else:
        if "contract not found" in bank_balance["error"]:
            dao.del_contract(MAIN_UNITY,bc._proxy.url)

        log("Impossible de récupérer la balance de la banque")
        return Response("Probleme avec la bank",500)



@app.route('/api/contacts/<addr>/')
def get_contacts(addr:str):
    rows=dao.get_friends(addr)
    rc = []
    for row in rows:
        rc.append({"firstname": row[2], "email": row[1],"address":row[0]})
    return jsonify(rc)


@app.route('/api/money/<addr>/',methods=['DELETE'])
def del_contacts(addr:str):
    dao.del_contract(addr,bc._proxy.url)
    return jsonify({"message":"monnaie dé"})





@app.route('/api/find_contact/<email>/')
def find_contact(email:str):
    contact=dao.find_contact(email)
    return jsonify(contact),201



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




#test http://localhost:5555/api/balance/erd1qqqqqqqqqqqqqpgqqvtq3xx0pgnehaynt6flzp8hyc0ckahf9e3se00ejh/erd1jgffp69cxeqqzvrv3u96da6lqwx5d6d6e7j9uau3dv84e34vwq4q3gzjxl/
@app.route('/api/balance/<contract>/<addr>/')
def getbalance(contract:str,addr:str):
    _m=dao.get_money_by_address(contract)
    if _m is None:
        return jsonify({"error":"Pas de money correspondante à l'adresse "+addr}), 200

    name=_m["unity"]
    log("La monnaie correspondant à l'adresse "+addr+" est "+name)

    rc = bc.getBalance(contract,addr)

    if rc is None:
        return jsonify({"error":"impossible d'évaluer la balance de "}),200
    else:
        log("Balance de "+addr+" à "+str(rc)+name.lower()+" pour le contrat "+bc.getExplorer(contract,"address"))
        return jsonify({"balance":rc["number"],"gas":str(rc["gas"]),"name":name}),200



@app.route('/api/gas/<addr>/')
def get_gas(addr:str):
    _a=Account(address=addr)
    gas = bc._proxy.get_account_balance(address=_a.address)
    return str(gas)



@app.route('/api/getyaml/<name>/')
def getyaml(name):
    f=open("./static/"+name+".yaml","r",encoding="utf-8")
    rc=yaml.safe_load(f.read())
    return jsonify(rc),200



@app.route('/api/new_account/<wait>/')
@app.route('/api/new_account/')
def new_account(wait="true"):
    factor = ""
    if not "elrond.com" in bc._proxy.url: factor = "0"
    _a,pem=bc.create_account(XGLD_FOR_NEWACCOUNT+factor)

    log("Création du compte " + _a.address.bech32() +". Demande de transfert de la monnaie par defaut")

    rc=bc.transfer(app.config["cmk"], bc.bank, _a, CREDIT_FOR_NEWACCOUNT)
    if wait=="true":
        t=bc.wait_transaction(rc["tx"], not_equal="pending",timeout=5)
        log("Résultat du transfert " + str(t))


    #TODO: private key a crypter

    cmk:dict=dao.get_money_by_name(MAIN_UNITY,bc._proxy.url)

    keys = {"public": _a.address.bech32(), "private": _a.private_key_seed}
    return jsonify({"address":_a.address.bech32(),"keys":keys,"pem":pem,"default_money":cmk["addr"]}),200



@app.route('/api/moneys/<addr>/')
@app.route('/api/moneys/')
def getmoneys(addr:str=""):
    log("Récépuration de l'ensemble des monnaies pour "+addr)
    return json_util.dumps(dao.get_moneys(addr,bc._proxy.url))



#http://localhost:5555/api/raz/hh4271
@app.route('/api/raz/<password>/')
def raz(password:str):
    log("Demande d'effacement de la base")
    if password!="hh4271":return "Password incorrect",501
    if dao.raz(bc._proxy.url):
        init_cmk(bc,dao)
    return jsonify({"message":"Effacement terminé"}),200




#http://localhost:6660/api/name/erd1qqqqqqqqqqqqqpgqmfgwk0rh2mq5ta5dmznqxrdfx7w5n8kf9vmsy2snym/
@app.route('/api/name/<contract>/')
def getname(contract:str):
    rc=bc.getName(contract)
    if rc is None:return "Pas de monnaie correspondant au contrat "+contract,404
    return jsonify({"name":rc}), 200





if __name__ == '__main__':
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


