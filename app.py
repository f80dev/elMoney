import base64
import json
import os
import ssl
import sys

from apscheduler.schedulers.background import BackgroundScheduler

import yaml
from erdpy.accounts import Account
from erdpy.transactions import Transaction

from flask import  Response, request, jsonify


from Tools import  log, send_mail, open_html_file, now, send
from apiTools import create_app

from dao import DAO
from definitions import DOMAIN_APPLI, MAIN_UNITY, CREDIT_FOR_NEWACCOUNT, APPNAME, \
    MAIN_URL, TOTAL_DEFAULT_UNITY, SIGNATURE, IPFS_NODE, \
    MAIN_NAME, MAIN_DECIMALS, NETWORKS, ESDT_CONTRACT
from elrondTools import ElrondNet
from ipfs import IPFS

scheduler = BackgroundScheduler()


def init_default_money(bc,dao):
    """
    :return: l'adresse de la monnaie par defaut
    """
    if bc.bank is None:
        log("Vous devez initialiser la bank pour créer le contrat de monnaie par défaut")
        return None

    _balance=bc.getMoneys(bc.bank)
    if not "tokenIdentifier" in NETWORKS[bc.network_name] or not NETWORKS[bc.network_name]["tokenIdentifier"] in _balance:
        log("Le contrat de "+MAIN_UNITY+" n'est pas valable")
        money_idx=""
    else:
        log("Balance de la bank "+str(_balance))
        money_idx = NETWORKS[bc.network_name]["tokenIdentifier"]

    if len(money_idx) == 0:
        log("Pas de monnaie dans la configuration, on déploy "+MAIN_NAME+" d'unite "+MAIN_UNITY)
        rc=bc.deploy(bc.bank, MAIN_NAME,MAIN_UNITY,TOTAL_DEFAULT_UNITY,MAIN_DECIMALS,timeout=20)
        if "error" in rc:
            log("Impossible de déployer le contrat de la monnaie par defaut "+rc["message"])
            return None

        if not "contract" in rc:
            money_idx=rc["id"]
        else:
            money_idx = rc["contract"]

    if dao.get_money_by_idx(money_idx) is None:
        dao.add_money(money_idx,MAIN_UNITY,MAIN_DECIMALS,bc.bank.address.bech32(),True,True,MAIN_URL,bc._proxy.url)

    log("Contrat de la monnaie par defaut déployer à "+money_idx)
    return money_idx



#Paramétres en ligne de commande
#1=port du serveur
#2=adresse du proxy de la blockchain
#3=nom de la base de données

bc = ElrondNet(network_name=sys.argv[2])
dao=DAO("server",sys.argv[3])
init_default_money(bc,dao)
app, socketio = create_app()



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

    _erc20=dao.get_money_by_name(MAIN_UNITY,bc._proxy.url)

    return jsonify({"address":address,"pem":body}),200



def refresh_client(dest:str,comment:str=""):
    send(socketio,"refresh_account",dest,"",{"comment":comment})
    scheduler.remove_job("id_"+dest)




@app.route('/api/refund/<dest>/',methods=["GET"])
def refund(dest:str):
    _dest=Account(dest)
    amount="%.0f" % NETWORKS[bc.network_name]["new_account"]

    if bc.credit(bc.bank,_dest,amount):
        account=bc._proxy.get_account_balance(_dest.address)
        return jsonify({"gas":account}),200
    else:
        return Response("probleme de rechargement",500)



#test http://localhost:5000/api/transfer
@app.route('/api/transfer/<idx>/<dest>/<amount>/<unity>/',methods=["POST"])
def transfer(idx:str,dest:str,amount:str,unity:str):

    _money=dao.get_money_by_idx(idx)
    if _money is None:return "Monnaie inconnue",500

    addr_dest=None
    if "@" in dest:
        _u=dao.find_contact(dest)
        if not _u is None: addr_dest=_u["addr"]
    else:
        addr_dest=dest

    if addr_dest is None:
        log("Le destinataire n'a pas encore d'adresse elrond")
        _dest,pem_dest=bc.create_account(NETWORKS[bc.network_name]["new_account"])
        send_mail(open_html_file("share", {
            "email": dest,
            "amount": str(amount),
            "appname":APPNAME,
            "unity": unity.lower(),
            "url_appli": DOMAIN_APPLI + "?contract=" + idx + "&user=" + _dest.address.bech32(),
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
    rc=bc.transferESDT(idx,_from,_dest,int(amount)*(10**_money["decimals"]))

    if not "error" in rc:
        log("Transfert effectué " + str(rc) + " programmation du rafraichissement des comptes")
        scheduler.add_job(refresh_client,id="id_"+rc["to"],args=[rc["to"],unity],trigger="interval",minutes=0.02,max_instances=1)
        scheduler.add_job(refresh_client,id="id_"+rc['from'],args=[rc['from']],trigger="interval",minutes=0.05,max_instances=1)
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
        rc="./PEM/"+NETWORKS[bc.network_name]["bank"]+".pem"
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
    rc=bc.evalprice(sender,NETWORKS[bc.network_name]["nft"],value,data)
    return jsonify(rc)



@app.route('/api/burn/<token_id>/',methods=["POST"])
def burn(token_id,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file=get_pem_file(data)
    rc=bc.burn(NETWORKS[bc.network_name]["nft"],pem_file,token_id)
    os.remove(pem_file)

    send(socketio,"refresh_nft",rc["sender"])

    #TODO: ajouter la destruction du fichier

    return jsonify(rc)



#tag: get_tokens tokens all_tokens
#http://localhost:6660/api/nfts/
@app.route('/api/nfts/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/<owner_filter>/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/<owner_filter>/<miner_filter>/',methods=["GET"])
def nfts(seller_filter="0x0",owner_filter="0x0",miner_filter="0x0"):
    rc=[]

    for uri in bc.get_uris(NETWORKS[bc.network_name]["nft"],seller_filter,owner_filter,miner_filter):
        rc.append(uri)

    return jsonify(rc),200




@app.route('/api/update_price/<token_id>/',methods=["POST"])
def update_price(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file = get_pem_file(data)
    rc = bc.set_price(NETWORKS[bc.network_name]["nft"], pem_file, token_id,float(data["price"])*100)
    send(socketio,"nft_store")
    return jsonify(rc),200




@app.route('/api/open_nft/<token_id>/',methods=["POST"])
def open_nft(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file = get_pem_file(data)
    tx = bc.nft_open(NETWORKS[bc.network_name]["nft"], pem_file, token_id)
    os.remove(pem_file)

    if "scResults" in tx:
        if tx["status"]=="fail":
            rc=tx["scResults"][0]["returnMessage"]
        else:
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
    tx = bc.set_state(NETWORKS[bc.network_name]["nft"], pem_file, token_id,state)
    os.remove(pem_file)

    send(socketio,"refresh_nft")
    return jsonify(tx),200




#http://localhost:6660/api/test/
@app.route('/api/test/',methods=["GET"])
def test():
    rc=bc.check_contract(NETWORKS[bc.network_name]["nft"])
    return jsonify(rc),200



#http://localhost:6660/api/test/
@app.route('/api/sendtokenbyemail/<dests>/',methods=["POST"])
def sendtokenbyemail(dests:str):
    data = json.loads(str(request.data, encoding="utf-8"))
    html=open_html_file("share_token",{
        "appname":APPNAME,
        "signature":SIGNATURE,
        "url":data["url"],
        "title":data["title"],
        "message":data["message"]
    })
    send_mail(html,dests,subject=data["title"])
    return jsonify({"message":"token envoyé"}),200



@app.route('/api/transfer_nft/<token_id>/<dest>/',methods=["POST"])
def transfer_nft(token_id,dest,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file=get_pem_file(data)
    rc=bc.nft_transfer(NETWORKS[bc.network_name]["nft"],pem_file,token_id,dest)
    os.remove(pem_file)
    if not rc is None:
        send(socketio,"refresh_nft")
        send(socketio,"refresh_balance",rc["sender"])
        send(socketio, "refresh_balance", rc["receiver"])
    return jsonify(rc)



@app.route('/api/buy_nft/<token_id>/<price>/<seller>/',methods=["POST"])
def buy_nft(token_id,price,seller:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    pem_file=get_pem_file(data)
    if seller.startswith("erd"):seller="0x"+Account(address=seller).address.hex()
    rc=bc.nft_buy(NETWORKS[bc.network_name]["nft"],pem_file,token_id,float(price),seller)
    os.remove(pem_file)
    if not rc is None:
        send(socketio,"refresh_nft")
        send(socketio,"refresh_balance",rc["sender"])
        send(socketio, "refresh_balance", rc["receiver"])
    return jsonify(rc)





#http://localhost:5555/api/mint/
@app.route('/api/mint/<count>/',methods=["POST"])
def mint(count:str,data:dict=None):
    """
    API de création d'un token non fongible
    :param count:
    :param data:
    :return:
    """
    log("Appel du service de déploiement de contrat NFT")

    if data is None:
        data = str(request.data, encoding="utf-8")
        log("Les données de fabrication sont " + data)
        data = json.loads(data)

    #Chargement des fichiers
    client = IPFS(IPFS_NODE)
    if "file" in data and len(data["file"])>0:
        res = client.add(data["file"])
        log("Transfert IPFS du fichier : https://ipfs.io/ipfs/"+res)
        secret=res
    else:
        secret = data["secret"]

    res_visual = ""
    if "visual" in data and len(data["visual"])>0:
        res_visual = "%%" + client.add(data["visual"])

    pem_file=get_pem_file(data)
    owner = Account(pem_file=pem_file)

    #nft_contract_owner=Account(pem_file="./PEM/"+NETWORKS[bc.network_name]["bank"]+".pem")

    uri=data["signature"]+res_visual
    price = int(float(data["price"]) * 1e18)
    max_markup=int(float(data["max_markup"]) * 100)
    min_markup=int(float(data["min_markup"]) * 100)
    properties=int(data["properties"])
    miner_ratio=int(data["miner_ratio"]*100)

    #TODO: ajouter ici un encodage du secret dont la clé est connu par le contrat

    arguments=[int(count),"0x"+uri.encode().hex(),"0x"+secret.encode().hex(),price,min_markup,max_markup,properties,miner_ratio]
    result=bc.mint(NETWORKS[bc.network_name]["nft"],owner,arguments)

    if len(result["scResults"])>0:
        if result["status"] == "fail":
            return result["scResults"][0]["returnMessage"],500
        else:
            return_string=str(base64.b64decode(result["scResults"][0]["data"]),"utf-8")
            last_new_id=int(return_string.split("@")[2],16)
            tokenids=range(last_new_id-int(count),last_new_id)

            #TODO: a optimiser pour pouvoir passer plusieurs distributeurs à plusieurs billet
            if "dealers" in data and len(data["dealers"])>0:
                for dealer in data["dealers"]:
                    for tokenid in tokenids:
                        _dealer=Account(address=dealer["address"])
                        arguments=[tokenid,"0x"+_dealer.address.hex()]
                        tx=bc.add_dealer(NETWORKS[bc.network_name]["nft"],pem_file,arguments)

            send(socketio, "refresh_nft")
            send(socketio,"refresh_balance",owner.address.bech32())
            os.remove(pem_file)

            return jsonify(result), 200
    else:
        return "Probleme technique",500





@app.route('/api/owner_of/<contract>/<token>/',methods=["GET"])
def owner_of(contract,token):
    rc=bc.owner_of(contract,token)
    return jsonify(rc),200



@app.route('/api/transactions/<user>/',methods=["GET"])
def transactions(user:str):
    rc=[]
    for addr in [NETWORKS[bc.network_name]["nft"]]:
         for t in bc.getTransactions(addr):
            try:
                data = str(base64.b64decode(t["data"]), "utf-8")
            except:
                data=t["data"]

            sign=-1
            if data.startswith("bWludE"):data="Creation d'un token"
            if data.startswith("add_dealer"):data= "Ajout d'un distributeur"
            if data.startswith("YnV5QD") or data.startswith("YWRkX2"):
                data="Achat"
                sign=1
            if data.startswith("price"): data = "Mise a jour du prix"
            if data.startswith("mint"): data = "Création d'un token"
            if data.startswith("burn"): data = "Destruction d'un token"
            if data.startswith("setstate"): data = "Mise en vente"
            if data.startswith("open"): data = "Ouverture"

            if not "@" in data:
                if "scResults" in t:
                    for tt in t["scResults"]:
                        if tt["receiver"]==user or tt["sender"]==user:
                            data2 = str(base64.b64decode(tt["data"]), "utf-8")
                            if "@" in data2:data2=""

                            rc.append({
                                "data":data+":"+data2,
                                "value":sign*float(tt["value"])/1e18
                            })
                else:
                    if t["receiver"]==user or t["sender"]==user:

                        rc.append({
                            "data": data + ":" + data2,
                            "value":sign* float(t["value"]) / 1e18
                        })
            else:
                print(data)


    return jsonify(rc),200




@app.route('/api/add_dealer/<token_id>/',methods=["POST"])
def add_dealer(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))
    pem_file = get_pem_file(data["pem"])

    _dealer = Account(address=data["addr"])
    arguments = [int(token_id), "0x" + _dealer.address.hex()]
    tx = bc.add_dealer(NETWORKS[bc.network_name]["nft"], pem_file, arguments)

    return jsonify(tx), 200




@app.route('/api/deploy/<name>/<unity>/<nbdec>/<amount>/',methods=["POST"])
def deploy(name:str,unity:str,nbdec:str,amount:str,data:dict=None):
    log("Appel du service de déploiement d'ESDT de nom="+name+" unite="+unity)

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
    result=bc.deploy(owner,name,unity.upper(),int(amount),int(nbdec))

    if "error" in result:
        log("Probléme de création de la monnaie "+str(result))
        return jsonify(result), 500
    else:
        send_mail(open_html_file("money",{
            "idx":result["id"],
            "unity":unity,
            "appname":APPNAME,
            "devise":NETWORKS[bc.network_name]["unity"],
            "bill":result["cost"],
            "amount":str(amount),
            "signature":SIGNATURE,
        }),_to=data["email"],subject="Confirmation de création du "+unity)
        dao.add_money(result["id"],unity,int(nbdec),result["owner"],data["public"],data["transferable"],data["url"],bc._proxy.url)

    return jsonify(result),200





#http://localhost:5555/api/server_config/
@app.route('/api/server_config/')
def server_config():
    log("Récupération de la configuration du server avec la bank "+bc.bank.address.bech32())

    infos = {
        "bank_addr": bc.bank.address.bech32(),
        "proxy": bc._proxy.url,
        "network":bc.network_name,
        "nft_contract": NETWORKS[bc.network_name]["nft"],
        "esdt_contract": ESDT_CONTRACT,
        "bank_gas":bc._proxy.get_account_balance(bc.bank.address),
        "explorer":bc._proxy.url.replace("-api","-explorer"),
        "wallet": bc._proxy.url.replace("-api", "-wallet")+"/unlock/pem"
    }

    bank_balance=bc.getMoneys(bc.bank)
    if "tokenIdentifier" in NETWORKS[bc.network_name] and NETWORKS[bc.network_name]["tokenIdentifier"] in bank_balance:
        infos["default_money"]=bank_balance[NETWORKS[bc.network_name]["tokenIdentifier"]]["unity"]
        infos["bank_esdt_ref"]=NETWORKS[bc.network_name]["tokenIdentifier"]
        infos["bank_esdt"]=bank_balance[NETWORKS[bc.network_name]["tokenIdentifier"]]["balance"]
        log("Balance de la bank " + str(bank_balance))
    else:
        log("Pas de monnaie disponible, on charge celle du fichier de config " + str(bank_balance))

    return jsonify(infos),200





@app.route('/api/contacts/<addr>/')
def get_contacts(addr:str):
    rows=dao.get_friends(addr)
    rc = []
    for row in rows:
        rc.append({"firstname": row[2], "email": row[1],"address":row[0]})
    return jsonify(rc)




@app.route('/api/money/<idx>/',methods=['DELETE'])
def del_contacts(idx:str):
    dao.del_contract(idx,bc._proxy.url)
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
@app.route('/api/balance/<addr>/')
def getbalance(addr:str):
    _u = Account(address=addr)
    rc = bc.getMoneys(_u)
    return jsonify(rc),200



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


@app.route('/api/new_account/')
def new_account():
    _a,pem=bc.create_account(NETWORKS[bc.network_name]["new_account"])

    log("Création du compte " + _a.address.bech32() +". Demande de transfert de la monnaie par defaut")

    #TODO: private key a crypter
    keys = {"public": _a.address.bech32(), "private": _a.private_key_seed}
    rc={"address":_a.address.bech32(),
        "keys":keys,
        "pem":pem
        }

    esdt:dict=dao.get_money_by_name(MAIN_UNITY,bc._proxy.url)
    if not esdt is None:
        bc.transferESDT(esdt["idx"], bc.bank, _a, CREDIT_FOR_NEWACCOUNT*(10**esdt["decimals"]))
        rc["default_money"]=esdt["idx"]
        rc["default_name"]=esdt["unity"]
    else:
        log("Pas de monnaie par défaut, Les ESDT ne sont pas actifs")


    return jsonify(rc),200



@app.route('/api/moneys/<addr>/')
@app.route('/api/moneys/')
def getmoneys(addr:str=""):
    log("Récépuration de l'ensemble des monnaies pour "+addr)
    return jsonify(bc.getMoneys(Account(address=addr)))


#http://localhost:5555/api/raz/hh4271
@app.route('/api/raz/<password>/')
def raz(password:str):
    log("Demande d'effacement de la base")
    if password!="hh4271":return "Password incorrect",501
    if dao.raz(bc._proxy.url):
        init_default_money(bc,dao)
    return jsonify({"message":"Effacement terminé"}),200



@app.route('/api/validate/<owner>/<miner>/')
def validate(owner:str,miner:str):
    rc=bc.validate(NETWORKS[bc.network_name]["nft"],owner,miner)
    return jsonify(rc)



#http://localhost:6660/api/name/erd1qqqqqqqqqqqqqpgqmfgwk0rh2mq5ta5dmznqxrdfx7w5n8kf9vmsy2snym/
@app.route('/api/name/<contract>/')
def getname(contract:str):
    rc=bc.getName(contract)
    if rc is None:return "Pas de monnaie correspondant au contrat "+contract,404
    return jsonify({"name":rc}), 200





if __name__ == '__main__':
    _port=int(sys.argv[1])
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


