import base64
from io import BytesIO
import pandas as pd
import json
import os
import ssl
import sys

from AesEverywhere import aes256
from AesEverywhere.aes256 import decrypt
from apscheduler.schedulers.background import BackgroundScheduler

import yaml
from erdpy.accounts import Account
from erdpy.contracts import SmartContract


from flask import Response, request, jsonify, send_file, make_response

from Tools import log, send_mail, open_html_file, now, send, dictlist_to_csv, returnError, extract
from apiTools import create_app

from dao import DAO
from definitions import DOMAIN_APPLI, MAIN_UNITY, CREDIT_FOR_NEWACCOUNT, APPNAME, \
    MAIN_URL, TOTAL_DEFAULT_UNITY, SIGNATURE, \
    MAIN_NAME, MAIN_DECIMALS, NETWORKS, ESDT_CONTRACT, LIMIT_GAS, SECRET_KEY, ESDT_PRICE, IPFS_NODE_HOST,IPFS_NODE_PORT
from elrondTools import ElrondNet
from giphy_search import ImageSearchEngine
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
    if not "identifier" in NETWORKS[bc.network_name] or not NETWORKS[bc.network_name]["identifier"] in _balance:
        log("Le contrat de "+MAIN_UNITY+" n'est pas valable")
        money_idx=""
    else:
        log("Balance de la bank "+str(_balance))
        money_idx = NETWORKS[bc.network_name]["identifier"]

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
    _to=get_elrond_user(request.data)
    pubkey=_to.address.bech32()
    body=str(request.data,"utf8")
    return jsonify({"address":pubkey,"pem":body,"addr":pubkey}),200



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


def convert_email_to_addr(dest:str,html_email:str):
    addr_dest = None
    if "@" in dest:
        _u = dao.get_user(dest)
        if not _u is None: addr_dest = _u["addr"]
    else:
        addr_dest = dest

    if addr_dest is None:
        log("Le destinataire n'a pas encore d'adresse elrond")
        _dest,pem_dest=bc.create_account(NETWORKS[bc.network_name]["new_account"])
        html_email = html_email.replace("#addr#",_dest.address.bech32())
        send_mail(html_email, _to=dest, subject="Transfert",attach=pem_dest)
        dao.add_contact(email=dest,addr=_dest.address.bech32())
    else:
        _dest=Account(address=addr_dest)

    return _dest




#test http://localhost:5000/api/transfer
@app.route('/api/transfer/<idx>/<dest>/<amount>/<unity>/',methods=["POST"])
def transfer(idx:str,dest:str,amount:str,unity:str):

    #_money=dao.get_money_by_idx(idx)
    #if _money is None:return "Monnaie inconnue",500

    _dest=convert_email_to_addr(dest,open_html_file("share", {
        "email": dest,
        "amount": str(amount),
        "appname":APPNAME,
        "unity": unity.lower(),
        "url_appli": DOMAIN_APPLI + "?contract=" + idx + "&user=#addr#",
        "signature": SIGNATURE
    }))

    log("Demande de transfert vers "+_dest.address.bech32()+" de "+amount+" "+unity)

    pem_file=get_elrond_user(request.data)
    _from = Account(pem_file=pem_file)

    log("Appel du smartcontract")
    rc=bc.transferESDT(idx,_from,_dest.address.bech32(),int(amount)*(10**18))

    if not "error" in rc:
        log("Transfert effectué " + str(rc) + " programmation du rafraichissement des comptes")
        scheduler.add_job(refresh_client,id="id_"+rc["to"],args=[rc["to"],unity],trigger="interval",minutes=0.02,max_instances=1)
        scheduler.add_job(refresh_client,id="id_"+rc['from'],args=[rc['from']],trigger="interval",minutes=0.05,max_instances=1)
        return jsonify(rc),200
    else:
        log("Erreur lors du transfert "+str(rc))
        return jsonify(rc),500




from erdpy.wallet import pem
def get_elrond_user(data):
    """
    Fabrique ou recupere un pemfile
    :param data:
    :return:
    """
    if type(data)==dict and not "pem" in data:
        rc="./PEM/"+NETWORKS[bc.network_name]["bank"]+".pem"
    else:
        filename = "./PEM/temp" + str(now() * 1000) + ".pem"
        log("Fabrication d'un fichier PEM pour la signature et enregistrement sur " + filename)

        if type(data)==bytes:
            content=str(aes256.decrypt(base64.b64decode(str(data,"utf8")),SECRET_KEY),"utf8")
        else:
            if not type(data)==str and type(data["pem"]) == dict and "pem" in data["pem"]:data["pem"]=data["pem"]["pem"]

            if type(data)==str:
                content=data
            else:
                content=data["pem"]

            if not "BEGIN PRIVATE KEY" in content:
                content=str(aes256.decrypt(base64.b64decode(content),SECRET_KEY),"utf8")

        with open(filename, "w") as file:
            file.write(content)

        rc = Account(pem_file=filename)
        os.remove(filename)

    return rc




@app.route('/api/evalprice/<sender>/<data>/<value>/',methods=["GET"])
def evalprice(sender,data="",value=0):
    rc=bc.evalprice(sender,NETWORKS[bc.network_name]["nft"],value,data)
    return jsonify(rc)



@app.route('/api/users/',methods=["POST"])
def post_user(data:dict=None):
    data = json.loads(str(request.data, encoding="utf-8"))

    pem_file = get_elrond_user(data)
    if data["visual"].startswith("data:"):
        data["visual"]=client.add(data["visual"])

    if "shop_visual" in data and data["shop_visual"].startswith("data:"):
        data["shop_visual"]=client.add(data["shop_visual"])

    if not "website" in data or data["website"].length==0: data["website"] =app.config["DOMAIN_APPLI"]+"/miner?miner="+data["addr"]
    try:
        bc.update_account(pem_file,data)
    except:
        return jsonify({"error": "Probleme technique"}),500

    return jsonify({"reponse": "ok","body":data})



@app.route('/api/users/<addr>/',methods=["GET"])
def get_user(addr:str):
    if "@" in addr:
        _user=dao.get_user(addr)
        if _user is None:
            return jsonify({})
        else:
            addr=_user["addr"]

    data = bc.get_account(addr)
    if data is None: return Response("User unknown", 404)
    if "visual" in data and len(data["visual"])==46:data["visual"]="https://ipfs.io/ipfs/"+data["visual"]
    if "shop_visual" in data and len(data["shop_visual"])==46:data["shop_visual"]="https://ipfs.io/ipfs/"+data["shop_visual"]
    return jsonify(data),200



@app.route('/api/burn/<token_id>/',methods=["POST"])
def burn(token_id,data:dict=None):
    rc=bc.burn(NETWORKS[bc.network_name]["nft"],get_elrond_user(request.data),token_id)


    send(socketio,"refresh_nft",rc["sender"])
    send(socketio,"nft_store")

    #TODO ajouter la notification du mineur

    #TODO: ajouter la destruction du fichier

    return jsonify(rc)



#tag: get_tokens tokens all_tokens
#http://localhost:6660/api/nfts/
#http://localhost:6660/api/nfts/?format=json
#http://localhost:6660/api/nfts/?format=csv
@app.route('/api/nfts/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/<owner_filter>/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/<owner_filter>/<miner_filter>/',methods=["GET"])
def nfts(seller_filter="0x0",owner_filter="0x0",miner_filter="0x0"):
    rc=[]

    for uri in bc.get_tokens(seller_filter,owner_filter,miner_filter):
        _miner = bc.get_account(uri["miner"])
        if "pseudo" in _miner:
            uri["miner_name"]=_miner["pseudo"]
        rc.append(uri)

    format=request.args.get("format","json")
    if format=="json":
        return jsonify(rc),200

    if format=="excel" or format.startswith("xls"):
        df=pd.DataFrame.from_dict(rc)
        output = BytesIO()
        writer=pd.ExcelWriter(output,engine="xlsxwriter")
        df.to_excel(writer,sheet_name="Tokens")
        writer.close()
        output.seek(0)
        return send_file(output,
                         attachment_filename="Token.xlsx",
                         mimetype="application/vnd.ms-excel",
                         as_attachment=True)

    if format=="csv":
        return Response(dictlist_to_csv(rc),mimetype="text/csv")




@app.route('/api/update_price/<token_id>/',methods=["POST"])
def update_price(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    rc = bc.set_price(NETWORKS[bc.network_name]["nft"], get_elrond_user(data), token_id, float(data["price"]) * 100)
    send(socketio,"nft_store")
    return jsonify(rc),200




@app.route('/api/open_nft/<token_id>/',methods=["POST"])
def open_nft(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    _user=get_elrond_user(data)
    addr=_user.address.bech32()

    if len(SECRET_KEY)>0:
        response=data["response"]
        response=aes256.encrypt(response,SECRET_KEY).hex()
    else:
        response=data["response"].encode().hex()

    tx = bc.nft_open(NETWORKS[bc.network_name]["nft"], _user, token_id,response)


    if "smartContractResults" in tx:
        if tx["status"]=="fail" or "returnMessage" in tx["smartContractResults"][0]>0:
            rc=tx["smartContractResults"][0]["returnMessage"]
        else:
            for t in tx["smartContractResults"]:
                rc=t["data"]
                if "@" in rc and not rc.startswith("ESDTTransfer"):
                    rc=rc.split("@")[2]
                    try:
                        if len(SECRET_KEY)>0:
                            rc=str(aes256.decrypt(bytearray.fromhex(rc),SECRET_KEY),"utf8")
                        else:
                            rc=str(bytearray.fromhex(rc),"utf8")
                    except:
                        rc=str(bytearray.fromhex(rc),"utf8")
    else:
        rc="Impossible d'ouvrir le token"

    send(socketio,"refresh_account",addr,"")

    return jsonify({"response":rc,"cost":tx["cost"]})





@app.route('/api/state_nft/<token_id>/<state>/',methods=["POST"])
def state_nft(token_id:str,state:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    tx = bc.set_state(NETWORKS[bc.network_name]["nft"], get_elrond_user(data), token_id,state)

    send(socketio,"refresh_nft")
    return jsonify(tx),200


@app.route('/api/image_search/',methods=["GET"])
def image_search():
    rc=ImageSearchEngine().search(request.args.get("q"),request.args.get("type"))
    return jsonify(rc),200



@app.route('/api/resend/<addr>/',methods=["GET"])
def resend_pem(addr:str):
    _user=dao.get_user(addr)
    if _user and "pem" in _user and len(_user["pem"])>0:
        instant_access =app.config["DOMAIN_APPLI"]  + "/?instant_access=" + _user["pem"]+"&address="+_user["addr"]
        send_mail(open_html_file("resend_pem", {
            "dest": _user["email"],
            "delay":60,
            "public_key": _user["addr"],
            "instant_access":instant_access
        }), _user["email"], subject="Renvoi de votre fichier de signature", attach=_user["pem"])
        return "fichier de signature transmis",200
    else:
        return returnError("Pas de fichier de signature sauvegardé sur le serveur")



#http://localhost:6660/api/test/
@app.route('/api/test/',methods=["GET"])
def test():
    pass



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
def transfer_nft(token_id,dest):
    data = json.loads(str(request.data, encoding="utf-8"))


    _dest = convert_email_to_addr(dest,open_html_file("transfer_nft", {
        "from":data["from"],
        "url_appli": DOMAIN_APPLI + "/?user=#addr#",
        "message":data["message"]
    })
                                  )

    rc=bc.nft_transfer(NETWORKS[bc.network_name]["nft"], get_elrond_user(data["pem"]), token_id, _dest)
    if not rc is None:
        send(socketio,"refresh_nft")
        send(socketio,"refresh_balance",rc["sender"])
        send(socketio, "refresh_balance", rc["receiver"])
    return jsonify(rc)



@app.route('/api/buy_nft/<token_id>/<price>/<seller>/',methods=["POST"])
def buy_nft(token_id,price,seller:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    if seller == "0x0":
        seller = "0x0000000000000000000000000000000000000000000000000000000000000000"
    else:
        seller = "0x" + str(Account(address=seller).address.hex())
    #if seller.startswith("erd"): seller = "0x" + Account(address=seller).address.hex()

    if type(price)==str and "," in price:price=price.replace(",",".")
    tokenName=data["identifier"]

    _user=get_elrond_user(data)
    if tokenName!="EGLD":
        #On déclenche le transfert au smartcontract
        bc.transferESDT(tokenName, _user,
                        SmartContract(bc.contract).address.hex(),
                        float(price) * 1e18
                        )
        price=0

    rc=bc.nft_buy(NETWORKS[bc.network_name]["nft"],_user,token_id,float(price),seller,tokenName)

    if not rc is None:
        send(socketio,"refresh_nft")
        send(socketio,"refresh_balance",rc["sender"])
        send(socketio, "refresh_balance", rc["receiver"])
    return jsonify(rc)





#http://localhost:6660/api/mint/
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

    if data["gift"] is None:data["gift"]=0

    secret = data["secret"]

    # TODO: ajouter ici un encodage du secret dont la clé est connu par le contrat
    if len(secret)>0:
        if len(SECRET_KEY)>0:
            secret = aes256.encrypt(secret, SECRET_KEY).hex()
        else:
            secret=secret.encode().hex()
    else:
        secret=""

    if "file" in data and len(secret)==0:
        secret=data["file"].encode().hex()

    res_visual = ""
    if "visual" in data and len(data["visual"])>0:
        res_visual = "%%" + data["visual"]
        if data["fullscreen"]:res_visual=res_visual.replace("%%","!!")

    owner = get_elrond_user(data)

    #nft_contract_owner=Account(pem_file="./PEM/"+NETWORKS[bc.network_name]["bank"]+".pem")

    title=data["signature"]
    desc=data["description"]+res_visual
    price = int(float(data["price"]) * 1e4)
    max_markup=int(float(data["max_markup"]) * 100)
    min_markup=int(float(data["min_markup"]) * 100)
    properties=int(data["properties"])
    miner_ratio=int(data["miner_ratio"]*100)
    fee=int(float(data["fee"])*1e18)
    gift=int(float(data["gift"])*100)
    money:str=data["money"]

    pay_count=int(count)
    if data["properties"] & 0b00100000>0:
        pay_count=1 #Nombre de payment

    value=fee+pay_count*gift*1e16
    if not money.startswith("EGLD"):
        #Dans ce cas on sequestre le montant ESDT pour le cadeau
        transac=bc.transferESDT(money,Account(pem_file=pem_file),bc.contract,pay_count*gift*1e16)
        if "error" in transac:return returnError()
        value=fee
    else:
        money=""

    arguments = [int(count),
                 "0x" + title.encode().hex(),
                 "0x" + desc.encode().hex(),
                 "0x" + secret,
                 price, min_markup, max_markup,
                 properties,
                 miner_ratio,
                 gift,int(data["opt_lot"]),
                 "0x" + money.encode().hex()]
    log("Minage du token "+str(data))
    result=bc.mint(NETWORKS[bc.network_name]["nft"],owner,
                   arguments=arguments,
                   gas_limit=int(LIMIT_GAS*(1+int(count)/2)),
                   value=value)

    if not result is None:
        if result["status"] == "fail" or not "smartContractResults" in result:
            return returnError("Erreur de création du token")
        else:
            if True:
                return_string=result["smartContractResults"][0]["data"]
                if len(return_string.split("@"))>2:
                    last_new_id=int(return_string.split("@")[2],16)
                    tokenids=range(last_new_id-int(count),last_new_id)

                    #TODO: a optimiser pour pouvoir passer plusieurs distributeurs à plusieurs billet
                    if "dealers" in data and len(data["dealers"])>0:
                        for dealer in data["dealers"]:
                            i=0
                            for tokenid in tokenids:
                                _dealer=Account(address=dealer["address"])
                                tx=bc.add_dealer(NETWORKS[bc.network_name]["nft"],pem_file,[tokenid,"0x"+_dealer.address.hex()])
                                i=i+1

                    send(socketio, "refresh_nft")
                    send(socketio, "refresh_balance",owner.address.bech32())

                else:
                    return returnError(result["smartContractResults"][0]["returnMessage"])

            return jsonify(result), 200
    else:

        return returnError()




#
# @app.route('/api/owner_of/<contract>/<token>/',methods=["GET"])
# def owner_of(contract,token):
#     rc=bc.owner_of(token)
#     return jsonify(rc),200


#http://localhost:6660/api/transactions/erd1zez3nsz9jyeh0dca64377ra7xhnl4n2ll0tqskf7krnw0x5k3d2s5l6sf6
#http://localhost:6660/api/transactions/
@app.route('/api/transactions/',methods=["GET"])
@app.route('/api/transactions/<user>/',methods=["GET"])
def transactions(user:str=""):
    rc={"transactions":[],"charts":[]}
    charts=dict()
    for addr in [NETWORKS[bc.network_name]["nft"]]:
        for t in bc.getTransactionsByRest(addr):
            try:
                data = str(base64.b64decode(t["data"]), "utf-8")
                t["data"]=data
            except:
                data=t["data"]

            sign=0
            fee = -float(t["fee"])/1e18
            value = float(t["value"]) / 1e18

            comment=""
            if t["status"]!="success":
                value=0
                comment="annulée"

            if len(user)==0:
                sign=1
            else:
                if t["sender"]==user:sign=-1
                if t["receiver"]==user:sign=+1

            if data.startswith("mint"):data="Creation d'un token"
            if data.startswith("add_dealer"):data= "Ajout d'un distributeur"
            if data.startswith("new_dealer"):data= "Se déclarer commme distributeur"
            if data.startswith("add_miner"):data= "Approuver un fabricant"
            if data.startswith("price"): data = "Mise a jour du prix"
            if data.startswith("burn"): data = "Destruction d'un token"
            if data.startswith("setstate"): data = "Mise en vente"
            if data.startswith("open"):
                data = "Révéler le secret"
                if "scResults" in t and len(t["scResults"])>1:sign=0

            if data.startswith("buy"):
                data="Achat d'un NFT"
                t=bc.getTransaction(t["hash"])

            if sign!=0:
                log("Ajout de la transaction "+data+" : " + str(t))
                rc["transactions"].append({
                    "sender":t["sender"],
                    "receiver":t["receiver"],
                    "data": data,
                    "value": sign * value,
                    "fee": fee,
                    "transaction": t["hash"],
                    "comment":comment
                })


            if "smartContractResults" in t:
                for tt in t["smartContractResults"]:
                    if len(user)==0 or (tt["receiver"]==user or tt["sender"]==user):
                        if tt["receiver"]==user:sign=1
                        if tt["sender"] == user: sign=-1
                        if len(user)==0:sign=1
                        data2 = tt["data"]
                        if len(data2)>0:
                            rc["transactions"].append({
                                "receiver":tt["receiver"],
                                "sender": tt["sender"],
                                "data":data+": "+data2,
                                "value":sign*float(tt["value"])/1e18,
                                "fee":0,
                                "transaction":t["hash"]
                            })
                            if data.startswith("Achat"):
                                k=tt["receiver"]
                                if not k in charts:charts[k]=dict({"key":k,"value":0,"profil":dict()})
                                charts[k]["value"] = charts[k]["value"] + sign * value

    for profil in sorted(charts.values(),key=lambda item: item["value"],reverse=True):
        _profil=bc.get_account(profil["key"])
        if "pseudo" in _profil:
            rc["charts"].append({"value":profil["value"],"profil":_profil})

    return jsonify(rc),200


@app.route('/api/charts/',methods=["GET"])
def charts():
    rc=[]
    for dealer in bc.dealers():
        transactions=bc.getTransactions(dealer)
        rc.append(dealer["pseudo"])

    return jsonify(rc)




@app.route('/api/upload_file/',methods=["POST"])
def upload_file():
    if len(request.files)>0:
        cid=client.add_file(request.files.get("file"))
    else:
        try:
            cid=client.add(str(request.data,"utf8"))
        except:
            cid=client.add(base64.b64encode(request.data))

    return jsonify({"cid":cid})



@app.route('/api/reload_accounts/',methods=["POST"])
def reload_accounts():
    data = json.loads(str(request.data, encoding="utf-8"))
    for acc in data["accounts"]:
        bc.transferESDT(idx=NETWORKS[bc.network_name]["identifier"],
                            user_from=bc.bank,
                            user_to=Account(pem_file="./PEM/"+acc).address.bech32(),
                            amount=data["amount"] * (10 ** 18)
                            )
    return jsonify({"message":"reloaded"})





@app.route('/api/new_dealer/',methods=["POST"])
def new_dealer(data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    tx=bc.execute(NETWORKS[bc.network_name]["nft"], get_elrond_user(data["pem"]),
                  function="new_dealer", arguments=[],
                  )

    return jsonify(tx), 200



@app.route('/api/add_dealer/<token_id>/',methods=["POST"])
def add_dealer(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    for dealer in data["dealers"]:
        _dealer = Account(address=dealer["address"])
        arguments = [int(token_id), "0x" + _dealer.address.hex()]
        tx = bc.add_dealer(NETWORKS[bc.network_name]["nft"], get_elrond_user(data["pem"]), arguments)

    return jsonify(tx), 200




@app.route('/api/miners/<seller>/',methods=["GET"])
def get_miners(seller:str):
    miners = bc.miners(seller)
    return jsonify(miners), 200


#http://localhost:6660/api/dealers/
@app.route('/api/dealers/',methods=["GET"])
@app.route('/api/dealers/<addr>/',methods=["GET"])
def get_dealers(addr:str="0x0"):
    rc=[]
    for dealer in bc.dealers(addr):
        _dealer=bc.get_account(dealer["address"]) | dealer
        rc.append(_dealer)
    return jsonify(rc), 200


@app.route('/api/ask_ref/<addr_from>/<addr_to>/',methods=["GET"])
def ask_ref(addr_from:str,addr_to:str):
    _dealer=dao.get_user(addr_to)
    _creator=dao.get_user(addr_from)

    website=DOMAIN_APPLI+"/miner?addr="+_creator["addr"]
    if "website" in _creator:website=_creator["website"]

    send_mail(open_html_file("ask_ref",{
        "miner":_creator["addr"],
        "miner_website":website,
        "miner_explorer":NETWORKS[bc.network_name]["explorer"]+"/account/"+_creator["addr"],
        "miner_pseudo":_creator["pseudo"],
        "miner_email":_creator["email"],
        "autoref":DOMAIN_APPLI+"/?miner="+_creator["addr"]
    }),_dealer["email"],subject="Demande de référencement")
    return jsonify({"message":"ok"}), 200



@app.route('/api/dealer_state/<state>/',methods=["POST"])
def dealer_state(state:str,data:dict=None):
    if data is None: data = json.loads(str(request.data, encoding="utf-8"))
    tx=bc.dealer_state(get_elrond_user(data["pem"]), int(state))

    if not tx is None and tx["status"]=="success":
        return jsonify({"message":"ok"}), 200
    else:
        return jsonify({"message": "Problème technique"}), 501


@app.route('/api/add_miner/',methods=["POST"])
def add_miner(data:dict=None):
    if data is None:data = json.loads(str(request.data, encoding="utf-8"))


    data["address"]=dao.get_user(data["address"])["addr"]
    _miner = Account(address=data["address"])
    _profil_miner=bc.get_account(data["address"])

    if not "pseudo" in _profil_miner or len(_profil_miner["pseudo"])==0:
        return jsonify({"error":"Le créateur doit au moins avoir un pseudo"}),500

    _dealer=bc.get_account(extract(data["pem"],"PRIVATE KEY for ","----"))

    if "email" in _profil_miner:
        send_mail(open_html_file("informe_ref",{
            "dest":_profil_miner["pseudo"],
            "from":_dealer["shop_name"]
        }),_profil_miner["email"],subject="Vous venez d'être référencé")


    tx=bc.add_miner(NETWORKS[bc.network_name]["nft"],
                    get_elrond_user(data["pem"]), ["0x" + _miner.address.hex()]
                    )

    return jsonify(tx), 200



@app.route('/api/del_miner/',methods=["POST"])
def del_miner(data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    _miner = Account(address=data["address"])
    tx=bc.execute(NETWORKS[bc.network_name]["nft"],get_elrond_user(data["pem"]),"del_miner",["0x" + _miner.address.hex()])

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

    owner=get_elrond_user(data)
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





#http://localhost:6660/api/server_config/
@app.route('/api/server_config/')
def server_config():
    log("Récupération de la configuration du server avec la bank "+bc.bank.address.bech32())

    infos = {
        "bank_addr": bc.bank.address.bech32(),
        "proxy": bc._proxy.url,
        "network":bc.network_name,
        "new_esdt_price":ESDT_PRICE/1e18,
        "nft_contract": NETWORKS[bc.network_name]["nft"],
        "domain_appli":DOMAIN_APPLI,
        "esdt_contract": ESDT_CONTRACT,
        "bank_gas":bc._proxy.get_account_balance(bc.bank.address),
        "explorer":bc._proxy.url.replace("-gateway","-explorer"),
        "contract_explorer": bc._proxy.url.replace("-api", "-explorer")+"/address/"+NETWORKS[bc.network_name]["nft"],
        "wallet": bc._proxy.url.replace("-gateway", "-wallet")+"/unlock/pem",
        "wallet_domain": bc._proxy.url.replace("-gateway","-wallet") +"/"
    }

    bank_balance=bc.getMoneys(bc.bank)
    if "identifier" in NETWORKS[bc.network_name] and NETWORKS[bc.network_name]["identifier"] in bank_balance:
        infos["default_money"]=bank_balance[NETWORKS[bc.network_name]["identifier"]]["unity"]
        infos["bank_esdt_ref"]=NETWORKS[bc.network_name]["identifier"]
        infos["bank_esdt"]=bank_balance[NETWORKS[bc.network_name]["identifier"]]["balance"]
        log("Balance de la bank " + str(bank_balance))
    else:
        log("Pas de monnaie disponible, on charge celle du fichier de config " + str(bank_balance))

    return jsonify(infos),200



@app.route('/api/users/<addr>/',methods=["DELETE"])
def del_user(addr:str):
    rows=dao.del_user(addr)
    if rows.deleted_count==1:
        return jsonify({"message":"account remove"})
    else:
        return returnError("Ce compte n'est pas associé à un mail")




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
    contact=dao.get_user(email)
    return jsonify(contact),201



@app.route('/api/contacts/<owner>/',methods=["POST"])
def add_contact(owner:str):
    data=str(request.data,"utf-8")
    contact=json.loads(data)
    log("Ajout d'un contact avec les informations "+data)

    if dao.get_user(contact["email"]) is None:
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
    email=request.args.get("email")
    _user=dao.get_user(email)
    if _user is None:
        _a,pem=bc.create_account(NETWORKS[bc.network_name]["new_account"],email=email)
        n_row,pem=dao.save_user(email,_a.address.bech32(),pem)
        log("Création du compte " + _a.address.bech32() + ". Demande de transfert de la monnaie par defaut")

        instant_access = app.config["DOMAIN_APPLI"] + "/?instant_access=" + pem + "&address=" + _a.address.bech32()
        private = _a.private_key_seed
        send_mail(open_html_file("new_account",{
            "dest":email,
            "instant_access":instant_access,
            "public_key":_a.address.bech32(),
            "pem":_a.private_key_seed
        }),email,subject="Ouverture de votre compte",attach=pem)


        # TODO: private key a crypter

        if "identifier" in NETWORKS[bc.network_name]:
            decimals = 18
            if "decimals" in NETWORKS[bc.network_name]: decimals = int(NETWORKS[bc.network_name]["decimals"])
            bc.transferESDT(idx=NETWORKS[bc.network_name]["identifier"],
                            user_from=bc.bank,
                            user_to=_a.address.bech32(),
                            amount=CREDIT_FOR_NEWACCOUNT * (10 ** decimals)
                            )
        else:
            log("Pas de monnaie par défaut")
    else:
        _a = Account(address=_user["addr"])
        pem=""
        private=""


    rc = dict({
        "address": _a.address.bech32(),
        "addr": _a.address.bech32(),
        "keys": {"public": _a.address.bech32(), "private": private},
        "pem": pem,
        "default_money":NETWORKS[bc.network_name]["identifier"],
        "default_name": NETWORKS[bc.network_name]["unity"]
    })

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
    rc=bc.validate(owner,miner)
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
    #vérifier la connexion avec IPFS
    client:IPFS = IPFS(IPFS_NODE_HOST,IPFS_NODE_PORT)


    if "debug" in sys.argv:
        socketio.run(app,host="0.0.0.0", port=_port, debug=True)
    else:
        if "ssl" in sys.argv:
            context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            context.load_cert_chain("/certs/fullchain.pem", "/certs/privkey.pem")
            socketio.run(app,host="0.0.0.0",  port=_port,debug=False, ssl_context=context)
        else:
            socketio.run(app,host="0.0.0.0",  port=_port,debug=False)


