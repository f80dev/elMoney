import base64
from io import BytesIO

# try:
#     from PIL import Image
# except ImportError:
#     import Image
# import pytesseract

import pandas as pd
import json
import ssl
import sys
from hashlib import sha256
from AesEverywhere import aes256

from apscheduler.schedulers.background import BackgroundScheduler

import yaml
from erdpy.accounts import Account

from erdpy.contracts import SmartContract
from flask import Response, request, jsonify, send_file
from Tools import log, send_mail, open_html_file, send, dictlist_to_csv, returnError, str_to_hex, \
    is_standard, hex_to_str, list_to_vec
from apiTools import create_app


from dao import DAO
from definitions import DOMAIN_APPLI, MAIN_UNITY, CREDIT_FOR_NEWACCOUNT, APPNAME, \
    MAIN_URL, TOTAL_DEFAULT_UNITY, SIGNATURE, \
    MAIN_NAME, MAIN_DECIMALS, NETWORKS, ESDT_CONTRACT, LIMIT_GAS, ESDT_PRICE, IPFS_NODE_HOST, \
    IPFS_NODE_PORT, LONG_DELAY_TRANSACTION, SHORT_DELAY_TRANSACTION, FIND_SECRET, MAX_MINT_NFT, ONE_WINNER, MAX_U64, \
    FOR_SALE, RESULT_SECTION, ZERO_ADDR
from elrondTools import ElrondNet
from giphy_search import ImageSearchEngine
from ipfs import IPFS
from secret import CRYPT_KEY_FOR_NFT
from social import SocialGraph

scheduler = BackgroundScheduler()


#Configuration du journal
import logging
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('apscheduler.scheduler').setLevel(logging.ERROR)
logging.getLogger('engineio.server').setLevel(logging.ERROR)
logging.getLogger('urllib3.connectionpool').setLevel(logging.ERROR)
logging.getLogger('flask_caching.backends.simplecache').setLevel(logging.ERROR)
logging.getLogger('environments').setLevel(logging.ERROR)



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
        rc=bc.deploy(bc.bank, MAIN_NAME,MAIN_UNITY,TOTAL_DEFAULT_UNITY,MAIN_DECIMALS)
        if "error" in rc:
            log("Impossible de déployer le contrat de la monnaie par defaut "+rc["message"])
            return None

        if not "contract" in rc:
            money_idx=rc["id"]
        else:
            money_idx = rc["contract"]

    try:
        if dao.get_money_by_idx(money_idx) is None:
            dao.add_money(money_idx,MAIN_UNITY,MAIN_DECIMALS,bc.bank.address.bech32(),True,True,MAIN_URL,bc._proxy.url)
    except:
        log("La base n'est pas disponible")
        return None

    log("Contrat de la monnaie par defaut déployer à "+money_idx)
    return money_idx



#Paramétres en ligne de commande
#1=port du serveur
#2=adresse du proxy de la blockchain
#3=nom de la base de données

bc = ElrondNet(network_name=sys.argv[2])
dao=DAO("server",sys.argv[3])
init_default_money(bc,dao)
app, socketio,cache = create_app()



@app.route('/api/events/<contract>/',methods=["GET"])
def event_loop(contract:str,dest:str,amount:str):
    bc.find_events(contract)




@app.route('/api/analyse_pem/',methods=["POST"])
def analyse_pem():
    _to=bc.get_elrond_user(request.data)
    if _to:
        pubkey=_to.address.bech32()
        _infos = bc.get_shard(pubkey)
        body=str(request.data,"utf8")
        return jsonify({"address":pubkey,"pem":body,"addr":pubkey,"shard":_infos["shard"]}),200
    else:
        return returnError()



def refresh_client(dest:str,comment:str=""):
    send(socketio,"refresh_account",dest,"",{"comment":comment})
    scheduler.remove_job("id_"+dest)




@app.route('/api/refund/<dest>/',methods=["GET"])
def refund(dest:str):
    _dest=Account(dest)
    amount="%.0f" % NETWORKS[bc.network_name]["new_account"]

    tx=bc.credit(bc.bank,_dest,amount)
    if tx is not None and tx["status"]=="success":
        account=bc._proxy.get_account_balance(_dest.address)
        return jsonify({"gas":account}),200
    else:
        return Response("probleme de rechargement",500)




def convert_email_to_addr(dest:str,html_email:str):
    """
    Ouvre un compte si besoin pour une adresse email
    :param dest: adresse email ou elrond du destinataire
    :param html_email: HTML file for the email
    :return: l'utilisateur elrond et l'utilisateur version base de donnée
    """
    addr_dest = None
    if "@" in dest:
        log("L'adresse est une adresse mail, on cherche dans les corespondances")
    else:
        addr_dest = dest

    if addr_dest is None:
        log("Le destinataire n'a pas encore d'adresse elrond")
        _dest,pem_dest=bc.create_account(NETWORKS[bc.network_name]["new_account"],name=dest.split("@")[0],email=dest)
        html_email = html_email.replace("#addr#",_dest.address.bech32())
        send_mail(html_email, _to=dest, subject="Transfert",attach=pem_dest)

        _infos = bc.get_shard(_dest.address.bech32())
        dao.save_user(dest, _dest.address.bech32(), pem_dest, shard=_infos["shard"])
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

    _from=bc.get_elrond_user(request.data)
    _user=bc.add_contact(_from,_dest.address.bech32())



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




import erdpy.wallet as wallet




@app.route('/api/evalprice/<sender>/<data>/<value>/',methods=["GET"])
def evalprice(sender,data="",value=0):
    rc=bc.evalprice(sender,NETWORKS[bc.network_name]["nft"],value,data)
    return jsonify(rc)


@app.route('/api/users/',methods=["POST"])
def save_user(data:dict=None):
    """
    Enregistrement de l'utilisateur
    :param data:
    :return:
    """
    data = json.loads(str(request.data, encoding="utf-8"))
    _sender = bc.get_elrond_user(data["pem"])

    if "visual" in data and data["visual"].startswith("data:"):data["visual"]=client.add(data["visual"])
    if "accept_all_dealers" in data and data["accept_all_dealers"]:
        data["accept_all_dealers"]=1
    else:
        data["accept_all_dealers"]=0

    if "identity" in data and data["identity"].startswith("data:"):data["identity"]=client.add(data["identity"])
    if "shop_visual" in data and data["shop_visual"].startswith("data:"):data["shop_visual"]=client.add(data["shop_visual"])

    if not "website" in data or len(data["website"])==0: data["website"] =app.config["DOMAIN_APPLI"]+"/miner?miner="+data["addr"]
    try:
        #https://docs.elrond.com/developers/account-storage/
        if bc.update_account(_sender,data) is None:
            return jsonify({"error": "Probleme technique"}), 500
    except:
        return jsonify({"error": "Probleme technique"}),500

    return jsonify({"reponse": "ok","body":data})


@app.route('/api/check_account/<addr>/',methods=["GET"])
def check_account(addr:str):
    log("Vérification du compte "+addr)
    _a=bc.get_account(addr,with_cache=False)
    if not _a is None:
        return jsonify(_a)

    return returnError("Compte incorrect")


@app.route('/api/users/<addrs>/',methods=["GET"])
@cache.cached(timeout=30)
def get_user(addrs:str):
    """
    Return the property of one or several users.
    :note if there is several users, function do not return the contacts of each address
    :param addrs:
    :return:
    """

    rc=[]
    if addrs != "anonymous" and len(addrs) > 0:
        for addr in addrs.split(","):
            data = bc.get_account(addr,False)
            if not data is None and not "error" in data:
                if "visual" in data and len(data["visual"])==46:data["visual"]="https://ipfs.io/ipfs/"+data["visual"]
                if "identity" in data and len(data["identity"]) == 46: data["identity"] = "https://ipfs.io/ipfs/" + data["identity"]
                if "shop_visual" in data and len(data["shop_visual"])==46:data["shop_visual"]="https://ipfs.io/ipfs/"+data["shop_visual"]
            else:
                return jsonify(data),500

            if "shard" in data:
                data["transaction_delay"]=LONG_DELAY_TRANSACTION
                if data["shard"]==NETWORKS[bc.network_name]["shard"]:data["transaction_delay"]=SHORT_DELAY_TRANSACTION

            if "authent" in data: data["authent"]=int(data["authent"])

            #TODO mettre ici un delay en fonction du shard
            rc.append(data)

    return jsonify(rc),200



@app.route('/api/burn/<network>/',methods=["POST"])
def burn(network:str):

    data=json.loads(str(request.data,"utf8"))
    _user=bc.get_elrond_user(data["pem"])
    if type(data["ids"])==int:
        ids=[data["ids"]]
    else:
        ids=list(data["ids"].split(","))

    if network=="db":
        rc=dao.burn(ids)
    else:
        rc=bc.burn(_user,ids)

    if rc:
        send(socketio,"refresh_nft",rc["owner"])
        send(socketio,"nft_store")

    #TODO ajouter la notification du mineur

    #TODO: ajouter la destruction du fichier

        return jsonify(rc)
    else:
        return returnError()


#http://localhost:6660/api/info_server/
@app.route('/api/info_server/',methods=["GET"])
def info_server():
    vecs=[t.hex for t in bc.query("tokens_map")]
    tokens=[]
    for v in vecs:
        tokens.append({
            "price":int(v[0:8], 16),
            "desc":int(v[8:24], 16),
            "secret":int(v[24:40], 16),
            "collection": int(v[40:56], 16),
            "gift": int(v[56:60], 16),
            "resp": int(v[60:62], 16),
            "min_markup": int(v[62:66], 16),
            "max_markup": int(v[66:70], 16),
            "owner": int(v[70:86], 16),
            "miner": int(v[86:102], 16),

            "properties":bin(int(v[102:106], 16)),
            "miner_ratio":int(v[106:110], 16),

            "money":int(v[110:114], 16),
            "status":int(v[114:116], 16),

            "dealers": int(v[116:118], 16),
        })

    result=bc.query("get_str",[1])

    strings=[]
    for s in bc.query("strs"):
        try:
            strings.append(str(base64.b64decode(s.base64), "utf8"))
        except:
            strings.append("chaine invalide")



    rc={
        "SC_address":NETWORKS[bc.network_name]["nft"],
        "SC_address_hex": Account(address=NETWORKS[bc.network_name]["nft"]).address.hex(),
        "network":bc.network_name,
        "raw_token":[x.hex for x in bc.query("tokens", arguments=[ZERO_ADDR,ZERO_ADDR,ZERO_ADDR], n_try=1)],
        "smart_token":bc.get_tokens(),
        "decoded_tokens_raw":tokens,
        "tokens":vecs,
        "raw_dealers":[x.hex for x in bc.query("dealers_map")],
        "nb_tokens":len(tokens),
        "addresses":[addr.hex for addr in bc.query("addresses")],
        "strings":strings,
        "get_str":str(result),
        "ESDTs":[x.hex for x in bc.query("ESDT_map")]
    }

    rc["idx_addr_zero"]=[addr.hex for addr in bc.query("get_idx_addresses",[ZERO_ADDR])]
    rc["idx_sc_addr"]=[addr.hex for addr in bc.query("get_idx_addresses",["0x00000000000000000500e3b74dae94d0e864635e88cfb0fa87aa775b1da8e7af"])]
    rc["idx_unknown_addr"]=[addr.hex for addr in bc.query("get_idx_addresses",["0x"+Account(address="erd1fwl724mvck4drdass0ass3ls43af4xvvx5u2nr8gt0qth7q086ysnjvl9v").address.hex()])]
    rc["dealers"] = bc.dealers()

    return jsonify(rc)




#tag: get_tokens tokens all_tokens get_nfts get_nft /tokens tokens/
#http://localhost:6660/api/nfts/
#http://localhost:6660/api/nfts/?format=json
#http://localhost:6660/api/nfts/?format=csv
@app.route('/api/nfts/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/<owner_filter>/',methods=["GET"])
@app.route('/api/nfts/<seller_filter>/<owner_filter>/<miner_filter>/',methods=["GET"])
@cache.cached(timeout=10)
def nfts(seller_filter="0x0",owner_filter="0x0",miner_filter="0x0"):
    rc=[]

    if dao.db:
        for t in dao.get_nfts(seller_filter,owner_filter,miner_filter):
            rc.append(t)

    cache=dict()
    for uri in bc.get_tokens(seller_filter,owner_filter,miner_filter,request.args.get("limit",100),request.args.get("offset",0)):
        if uri["miner"] in cache:
            _miner=cache[uri["miner"]]
        else:
            _miner = bc.get_account(uri["miner"])
            cache[uri["miner"]]=_miner

        if "pseudo" in _miner:
            uri["miner_name"]=_miner["pseudo"]
        rc.append(uri)

    #TODO a optimiser avant de remettre en service
    # if seller_filter+owner_filter+miner_filter=="0x00x00x0":
    #     addrs=dao.get_all_users("addr")
    #     rc=rc+bc.get_tokens_standard(addrs)
    # else:
    #     rc = rc + bc.get_tokens_standard([seller_filter.replace("0x0","")+owner_filter.replace("0x0","")+miner_filter.replace("0x0","")])

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




@app.route('/api/account_list/',methods=["GET"])
def account_list():
    rc=[]
    for _u in dao.get_all_users():
        del _u["_id"]
        del _u["pem"]
        rc.append(_u)
    return jsonify(rc)








@app.route('/api/update_price/<token_id>/',methods=["POST"])
def update_price(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    _dealer=bc.get_elrond_user(data["pem"])
    rc = bc.set_price(NETWORKS[bc.network_name]["nft"],_dealer, token_id, float(data["price"]) * 100)
    if not rc is None:
        send(socketio,"nft_store")
        return jsonify(rc),200
    else:
        return returnError("Impossible de mettre a jour le prix")




@app.route('/api/open_nft/<token_id>/',methods=["POST"])
def open_nft(token_id:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    _user=bc.get_elrond_user(data)
    addr=_user.address.bech32()

    response=sha256(bytes(data["response"],"utf8")).hexdigest()

    tx = bc.nft_open(NETWORKS[bc.network_name]["nft"], _user, token_id,response)

    if RESULT_SECTION in tx:
        if tx["status"]=="fail":
            rc=tx[RESULT_SECTION][0]["returnMessage"]
        else:
            for t in tx[RESULT_SECTION]:
                rc=t["data"]
                if "@" in rc and not rc.startswith("ESDTTransfer"):
                    rc=rc.split("@")[2]
                    try:
                        if len(CRYPT_KEY_FOR_NFT)>0:
                            rc=str(aes256.decrypt(bytearray.fromhex(rc),CRYPT_KEY_FOR_NFT),"utf8")
                        else:
                            rc=str(bytearray.fromhex(rc),"utf8")
                    except:
                        rc=str(bytearray.fromhex(rc),"utf8")
    else:
        rc="Impossible d'ouvrir le token"

    send(socketio,"refresh_account",addr,"")
    send(socketio, "open_nft", data["miner"], "")

    return jsonify({"response":rc,"cost":tx["cost"]})





@app.route('/api/update_field/<token_id>/<field_name>/',methods=["POST"])
def update_nft(token_id:str,field_name:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    arguments=[int(token_id),str_to_hex(field_name,True),str_to_hex(data["new_value"])]
    tx=bc.execute(NETWORKS[bc.network_name]["nft"],bc.get_elrond_user(data["pem"]),"update",arguments)
    return jsonify(tx),200



@app.route('/api/state_nft/<token_ids>/<state>/<network>/',methods=["POST"])
def state_nft(token_ids:str,state:str,network:str,data:dict=None):
    """
    changement du statut en vente / pas en vente
    :param token_id:
    :param state:
    :param data:
    :return:
    """
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    if "," in token_ids:
        ids=[int(x) for x in token_ids.split(",")]
    else:
        ids=[int(token_ids)]

    _owner=bc.get_elrond_user(data)
    if network=="elrond":
        tx = bc.set_state(NETWORKS[bc.network_name]["nft"], _owner, ids,state)

    if network=="db":
        tx=dao.set_state(owner=_owner.address.bech32(),token_ids=ids,state=state)

    send(socketio,"refresh_nft")
    return jsonify(tx),200



@app.route('/api/votes/<addr>/',methods=["GET"])
def get_votes(addr:str):
    rc=dict()
    for nft in bc.get_tokens(miner_filter=addr):
        if not nft["secret_vote"] and nft["vote"]:
            title=nft["title"]
            if not title in rc:rc[title]=dict({"nb_resp":0,"data":{},"title":title})
            resp=nft["resp"]
            if not resp in rc[title]["data"]:rc[title]["data"][resp]=0
            rc[title]["data"][resp]=rc[title]["data"][resp]+1
            rc[title]["nb_resp"]=rc[title]["nb_resp"]+1

    return jsonify(rc)



@app.route('/api/answer/<token_id>/',methods=["POST"])
def answer(token_id:str,data:dict=None):
    """
    Inscrire la réponse de l'utilisateur dans le token
    :param token_id:
    :param state:
    :param data:
    :return:
    """
    if data is None:data = json.loads(str(request.data, encoding="utf-8"))
    arguments=[int(token_id),int(data["resp"])]
    _user=bc.get_elrond_user(data['pem'])
    tx = bc.execute(NETWORKS[bc.network_name]["nft"],_user,"answer",arguments)

    send(socketio, "answer_nft", data["miner"], "")

    return jsonify(tx),200




@app.route('/api/image_search/',methods=["GET"])
def image_search():
    rc=ImageSearchEngine().search(request.args.get("q"),request.args.get("type"))
    return jsonify(rc),200



@app.route('/api/resend/<addr>/',methods=["GET"])
def resend_pem(addr:str):
    """
    renvoie un acces au compte de l'utilisateur
    exemple: http://localhost:4200/api/resend/
    :param addr:
    :return:
    """
    pem=dao.get_pem(addr)
    _user=bc.get_account(addr)
    if pem:
        instant_access =app.config["DOMAIN_APPLI"]  + "/?instant_access=" + str(_user["pem"],"utf8")+"&address="+_user["addr"]
        key_filename="macle.xpem"
        if "pseudo" in _user:
            key_filename=_user["pseudo"]+".xpem"
        else:
            if "email" in _user:
                key_filename = _user["email"].split("@")[0] + ".xpem"

        send_mail(open_html_file("resend_pem", {
            "dest": _user["email"],
            "delay":60,
            "public_key": _user["addr"],
            "instant_access":instant_access
        }), _user["email"], subject="Renvoi de votre fichier de signature", attach=_user["pem"],filename=key_filename)
        return "consultez le mail de "+addr+" pour récupérer l'accès",200
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
    _from=bc.get_elrond_user(data["pem"])

    _dest = convert_email_to_addr(dest,open_html_file("transfer_nft", {
        "from":data["from"],
        "url_appli": DOMAIN_APPLI + "/?user=#addr#",
        "message":data["message"]
        })
    )
    bc.add_contact(_from,_dest.address.bech32())

    rc=bc.nft_transfer(NETWORKS[bc.network_name]["nft"], _from, token_id, _dest)
    if not rc is None:
        send(socketio,"refresh_nft",rc["receiver"])
    return jsonify(rc)


@app.route('/api/delete_nft_from_db/<token_id>/',methods=["DELETE"])
def delete_nft_from_db(token_id):
    rows=dao.del_nft(int(token_id))
    if rows.deleted_count==1:
        return jsonify({"message":"NFT remove"})



@app.route('/api/buy_nft/<token_id>/<price>/<seller>/<network>/',methods=["POST"])
def buy_nft(token_id,price,seller:str,network:str,data:dict=None):
    if data is None:data = json.loads(str(request.data, encoding="utf-8"))

    if network=="db":
        tokenid=data["token_id"]
        data["network"]="elrond"
        result=mint(1,data)
        if type(result)==tuple:
            return returnError("Probleme technique")

        dao.del_nft(tokenid)
        token_id=result.json[0]["token_id"]


    if seller == "0x0":
        seller = "0x0000000000000000000000000000000000000000000000000000000000000000"
        if is_standard(data["token_id"]):
            seller=Account(address=data["owner"]).address.hex()
    else:
        seller = "0x" + str(Account(address=seller).address.hex())

    if type(price)==str and "," in price:price=price.replace(",",".")
    if not "identifier" in data:data["identifier"]="EGLD"
    tokenName=data["identifier"]

    _user=bc.get_elrond_user(data)
    if tokenName!="EGLD":
        #On déclenche le transfert au smartcontract
        bc.transferESDT(tokenName, _user,
                        SmartContract(bc.contract).address.hex(),
                        float(price) * 1e18
                        )
        price=0

    rc=bc.nft_buy(NETWORKS[bc.network_name]["nft"],_user,token_id,float(price),seller)
    if  not rc is None and rc["status"]!="fail":
        send(socketio,"refresh_nft")
        send(socketio,"refresh_balance",rc["sender"])
        send(socketio, "refresh_balance", rc["receiver"])

    return jsonify(rc)


#http://localhost:6660/api/ref_list/
@app.route('/api/ref_list/',methods=["GET"])
def ref_list():
    rc=[[],[],[],[]]
    for it in bc.query("addresses"):
        rc[0].append(it.hex)

    for money in bc.query("ESDT_map"):
        rc[1].append(str(base64.b64decode(money.base64),"utf8"))

    for dealer in bc.query("getDealer"):
        rc[2].append(dealer.hex)

    for token in bc.get_tokens():
        rc[3].append(token)

    return jsonify({
        "addresses":rc[0],
        "moneys":rc[1],
        "dealers":rc[2],
        "nfts":rc[3]
    })




#http://localhost:6660/api/deploy/
@app.route('/api/deploy/',methods=["POST"])
def deploy(count:str,data:dict=None):
    data = str(request.data, encoding="utf-8")
    rc=bc.deploy_contract(data["pem"],data["bytecode"])
    return jsonify(rc)



@app.route('/api/mint_from_file/<ope>/',methods=["POST"])
def mint_from_file(ope:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    if "base64" in data["content"]:
        data["content"]=str(base64.b64decode(data["content"].split("base64,")[1]),"utf8")

    format=request.args.get("filename","xlsx")

    if format.endswith("yaml"):
        rows=yaml.load(data["content"])["content"]

    rc=[]
    index=0
    for row in rows:
        body=dict()
        for key in row.keys():
            body[key]=row[key]

        body["properties"]=bc.eval_properties(row)
        body["pem"]=data["pem"]

        if ope=="mint":
            #Execution du fichier
            if index in data["to_mint"]:
                result=mint(row["count"],body)
                rc=rc+result.json
        else:
            #Analyse du fichier
            rc.append({"count":row["count"],"title":row["title"],"cost":bc.eval_gas(200),"to_mint":row["to_mint"],"index":index})

        index=index+1


    return jsonify(rc),200


def prepare_data(data,miner):
    """
    Prepare the data structure to be treat by the mint function
    :param data:
    :return:
    """
    log("Préparation des données de fabrication depuis " + str(data))

    if not "miner" in data: data["miner"] = miner.address.hex()
    if not "title" in data: data["title"] = data["signature"]
    if not "gift" in data or data["gift"] is None: data["gift"] = 0
    if not "secret" in data: data["secret"] = ""
    if not "price" in data: data["price"] = 0
    if not "deadline" in data: data["deadline"] = 0
    if not "network" in data: data["network"] = "elrond"
    if not "max_markup" in data: data["max_markup"] = 0
    if not "min_markup" in data: data["min_markup"] = 0
    if not "limit" in data: data["limit"] = 0
    if not "collection" in data: data["collection"] = ""
    if not "required_tokens" in data: data["required_tokens"]=[]
    if not "fee" in data: data["fee"] = 0
    if not "miner_ratio" in data: data["miner_ratio"] = 0
    if not "price" in data: data["price"] = 0
    if not "opt_lot" in data:
        data["opt_lot"] = 0
        data["one_winner"] = 0
    if not "money" in data: data["money"] = "EGLD"
    if not "elrond_standard" in data: data["elrond_standard"] = False
    if not "find_secret" in data: data["find_secret"] = 0
    if not "instant_sell" in data: data["instant_sell"] = 1
    if not "creator" in data or len(data["creator"])==0: data["creator"] = data["miner"]

    # TODO: ajouter ici un encodage du secret dont la clé est connu par le contrat
    data["secret"]=str(data["secret"])
    if len(data["secret"]) > 0:
        if data["find_secret"]:
            data["secret"] = sha256(bytes(data["secret"], "utf8")).hexdigest()
        else:
            if len(CRYPT_KEY_FOR_NFT) > 0:
                data["secret"] = aes256.encrypt(data["secret"], CRYPT_KEY_FOR_NFT).hex()
            else:
                data["secret"] = data["secret"].encode().hex()

    if "file" in data and len(data["file"])>0 and len(data["secret"])==0:
        if data["file"].startswith("."):
            f=open(data["file"],"rb")
            data["file"]=client.add_file(f)
            f.close()
        data["secret"]=data["file"].encode().hex()

    if type(data["price"]) == str:
        data["price"] = float(data["price"].replace(",", "."))

    data["fee"] = int(float(data["fee"]) * 1e18)
    data["value"] = int(float(data["gift"]) * 1e18)
    #voir la méthode
    data["deadline"]=int(float(data["deadline"])*(3600*24*1000))

    if "visual" in data and len(data["visual"]) > 0:
        res_visual = "%%" + data["visual"]
        if "fullscreen" in data and data["fullscreen"]: res_visual = res_visual.replace("%%", "!!")

    _d = {"desc": data["desc"]}
    if "title" in data: _d["title"] = data["title"]
    if "visual" in data: _d["visual"] = data["visual"]
    if "tags" in data: _d["tags"] = data["tags"]
    data["desc"]=_d

    return data



def prepare_arguments(data,owner,count=1):
    """
    Prepare les arguments pour le minage
    :param size:
    :param data:
    :param miner:
    :param owner:
    :return:
    """

    price = int(float(data["price"]) * 1e4)
    max_markup = int(float(data["max_markup"]) * 100)
    deadline = int(data["deadline"])
    if deadline==0: deadline=MAX_U64
    properties = int(data["properties"])
    miner_ratio = int(data["miner_ratio"] * 100)
    if type(data["gift"]) == str: data["gift"] = data["gift"].replace(",", ".")
    gift = int(float(data["gift"]) * 100)

    if not data["money"].startswith("EGLD") and not request.args.get("simulate") == "true":
        log("Dans ce cas on sequestre vers le contrat le montant ESDT")
        money = "0x" + data["money"].encode().hex()
    else:
        money = str_to_hex("EGLD")

    if data["properties"] & ONE_WINNER > 0: pay_count = 1  #TODO implémenté le nombre de payment

    miner=Account(address=data["miner"])
    creator=Account(address=data["creator"])

    description=json.dumps(data["desc"])
    rc=[count,
        "0x" + (data["collection"].encode().hex() if len(data["collection"])>0 else "0"),
        "0x" + str(description).encode().hex(),
        0 if len(data["required_tokens"])==0 else data["required_tokens"][0],
        "0x" + ("0" if len(data["secret"])==0 else data["secret"]),
        price,
        properties,
        "0x" + owner.address.hex(),
        "0x" + miner.address.hex(),
        "0x" + creator.address.hex(),
        miner_ratio,
        gift,
        deadline,
        data["limit"],
        money
        ]
    return rc



#http://localhost:6660/api/mint/
@app.route('/api/mint/<count>/',methods=["POST"])
def mint(count:str,data:dict=None):
    """
    API de création d'un token non fongible
    :param count:
    :param data:
    :return:
    """
    if data is None:data=json.loads(str(request.data, encoding="utf-8"))

    # Préparation du mineur
    miner = bc.get_elrond_user(data["pem"])
    if miner is None:
        miner = bc.bank
        log("Le minage se fait par la banque")

    data = prepare_data(data,miner)
    log("Minage du NFT " + data["title"]+" avec "+str(data))

    #Preparation du propriétaire
    owner = miner
    if "owner" in data:
        owner=convert_email_to_addr(data["owner"],open_html_file("transfer_nft"))

    if float(data["gift"])>0 and data["money"]!="EGLD":
        if "error" in bc.transferESDT(data["money"], miner, bc.contract, int(count) * data["value"]):
            return returnError()

    results=[]
    tokenids=[]

    # if request.args.get("simulate") == "true":
    #     gasCost = bc.estimate(NETWORKS[bc.network_name]["nft"], "mint", arguments)
    #     return jsonify({"gas": gasCost})

    if data["elrond_standard"]:
        log("Construction d'un NFT standard elrond")
        bc.mint_standard_nft(miner,
                             data["desc"]["title"],
                             {
                                "description":data["desc"]["desc"],
                                "secret":data["secret"],
                                "properties":hex(data["properties"]),
                                "state":hex(1)
                             },
                             count)
    else:
        if data["network"]=="elrond":
            count=int(count)
            while count>0:
                args = prepare_arguments(data, owner, count=min(MAX_MINT_NFT,count))
                result = bc.mint(
                    miner,
                    arguments=args,
                    value=data["value"]
                )
                if result is None or not "token_id" in result:
                    return returnError("Echec de la transaction de minage")
                count=count-MAX_MINT_NFT

        if data["network"]=="db":
            result=dao.mint(nft=data,miner=miner.address.bech32())
            tokenids=dao.clone(int(count) - 1,result["token_id"])

        tokenids=[result["token_id"]]+tokenids

        result["data"] = ""  # On efface la data pour minimiser la donnée restitué
        results.append(result)

    if "dealers" in data and len(data["dealers"]) > 0:
        log("Ajout des distributeurs")
        for dealer in data["dealers"]:
            _dealer = Account(address=dealer["address"])
            tx = bc.add_dealer(NETWORKS[bc.network_name]["nft"], data["pem"],
                               [list_to_vec(tokenids), "0x" + _dealer.address.hex()])

    for result in results:
        if not result is None:
            if result["status"] == "fail" or not RESULT_SECTION in result:
                log("Erreur de création du token")

    send(socketio, "refresh_nft",miner.address.bech32())
    if miner!=owner:
        send(socketio, "refresh_nft",owner.address.bech32())
    send(socketio, "refresh_balance", owner.address.bech32())

    return jsonify(results)




#
# @app.route('/api/owner_of/<contract>/<token>/',methods=["GET"])
# def owner_of(contract,token):
#     rc=bc.owner_of(token)
#     return jsonify(rc),200


@app.route('/api/graph/',methods=["GET"])
def get_graph():
    G = SocialGraph()

    miner=request.args.get("miner")

    transactions=[]
    for t in bc.getTransactionsByRest(NETWORKS[bc.network_name]["nft"]):
        t=bc.get_result(t)
        transactions.append(t)

    G.load(transactions,[miner],[],[NETWORKS[bc.network_name]["nft"]])
    return jsonify(G.export("json"))




#http://localhost:6660/api/transactions/erd1zez3nsz9jyeh0dca64377ra7xhnl4n2ll0tqskf7krnw0x5k3d2s5l6sf6
#http://localhost:6660/api/transactions/
@app.route('/api/transactions/',methods=["GET"])
@app.route('/api/transactions/<user>/',methods=["GET"])
def transactions(user:str=""):
    rc={"transactions":[],"charts":[]}
    charts=dict()
    for addr in [NETWORKS[bc.network_name]["nft"],user]:
        for t in bc.getTransactionsByRest(addr):
            if not "results" in t: t["results"] = []
            try:
                data = str(base64.b64decode(t["data"]), "utf-8")
                t["data"]=data
            except:
                data=t["data"]

            sign = 0
            if len(user)==0:
                sign=1
            else:
                if t["sender"]==user:sign=-1
                if t["receiver"]==user:sign=+1
                if sign==0:
                    for tt in t["results"]:
                        if tt["sender"] == user: sign = -1
                        if tt["receiver"] == user: sign = +1

            if sign!=0:
                t = bc.getTransaction(t["hash"])

                fee = -float(t["fee"])/1e18
                value = float(t["value"]) / 1e18

                comment=""
                if t["status"]!="success":
                    value=0
                    comment="annulée"

                if type(data)==str:
                    lbl=""
                    if data.startswith("mint"):lbl="Creation d'un eNFT"
                    if data.startswith("add_dealer"):lbl= "Ajout d'un distributeur"
                    if data.startswith("new_dealer"):lbl= "Se déclarer commme distributeur"
                    if data.startswith("add_miner"):lbl= "Approuver un fabricant"
                    if data.startswith("setSpecialRole") or data.startswith("issueSemiFungible"):lbl= "Autorisation de création d'un NFT"
                    if data.startswith("price"): lbl = "Mise a jour du prix"
                    if data.startswith("transferOwnership"): lbl = "Achat d'un NFT"
                    if data.startswith("burn"):
                        lbl = "Destruction d'un token"
                        sign=0

                    if data.startswith("ESDTNFTCreate"): lbl = "Création d'un NFT elrond"
                    if data.startswith("ESDTTransfer"): lbl = "Transfert d'un NFT"
                    if data.startswith("SaveKeyValue"): lbl = "Sauvegarde de vos préférences"
                    if data.startswith("Sent from") or data.startswith("refund"):
                        lbl = "Rechargement"
                        fee=0

                    if data.startswith("setstate"): lbl = "Mise en vente"
                    if data.startswith("open"):
                        lbl = "Révéler le secret"
                        if "scResults" in t and len(t["scResults"])>1:sign=0

                    if data.startswith("buy"):
                        lbl="Achat d'un NFT"
                        t=bc.getTransaction(t["hash"])

                    data=lbl


                    if sign!=0:
                        log("Ajout de la transaction "+data+" : " + str(t))
                        cost=0
                        if len(rc["transactions"])==0 or not t["hash"] in [_t["transaction"] for _t in rc["transactions"]]:
                            rc["transactions"].append({
                                "sender":t["sender"],
                                "receiver":t["receiver"],
                                "data": data,
                                "value": sign * value,
                                "fee": fee,
                                "cost": cost,
                                "transaction": t["hash"],
                                "comment":comment
                            })

                if "results" in t:
                    for tt in t["results"]:
                        if len(user)==0 or (tt["receiver"]==user or tt["sender"]==user):
                            if tt["receiver"]==user:sign=1
                            if tt["sender"] == user: sign=-1
                            if len(user)==0:sign=1
                            data2 = str(base64.b64decode(bytes(tt["data"],"utf8")),"utf8")
                            if data2.startswith("Owner pay") or data2.startswith("Miner refund"):
                                rc["transactions"].append({
                                    "receiver":tt["receiver"],
                                    "sender": tt["sender"],
                                    "data":lbl,
                                    "cost":0,
                                    "value":sign*float(tt["value"])/1e18,
                                    "fee":0,
                                    "transaction":t["hash"]
                                })
                                    # if data.startswith("Achat"):
                                    #     k=tt["receiver"]
                                    #     if not k in charts:charts[k]=dict({"key":k,"value":0,"profil":dict()})
                                    #     charts[k]["value"] = charts[k]["value"] + sign * value

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
        r=request.files.get("file")
        cid=client.add_file(r)
    else:
        try:
            cid=client.add(str(request.data,"utf8"))
        except:
            cid=client.add(base64.b64encode(request.data))

    return jsonify({"cid":cid})



@app.route('/api/reload_accounts/',methods=["POST"])
def reload_accounts():
    """
    Rechargement des comptes de test
    :return:
    """
    rc=[]
    data = json.loads(str(request.data, encoding="utf-8"))
    for acc in data["accounts"]:
        log("Traitement de "+acc)
        _test=Account(pem_file="./PEM/"+acc)
        # _user=dao.get_user(_test.address.bech32())
        _infos=bc.get_shard(_test.address.bech32())
        # if _user is None:
        #     if not dao.save_user("",_test.address.bech32(),"./PEM/"+acc,shard=_infos["shard"]):
        #         log("Probleme de création de "+acc)
        #     else:
        #         log("Transfert de fond en Egld pour " + acc)
        #         _test = Account(pem_file="./PEM/" + acc)

        right=True
        if bc.getMoneys(_test)["EGLD"]["solde"]<float(data["egld"]):
            result=bc.credit(bc.bank,_test,int(data["egld"]*1e18))
            if result is None:
                log("Impossible de créditer le compte, on supprime l'utilisateur de la base de données")
                dao.del_user(_test.address.bech32())
                right=False

        if right:
            log("Transfert de fond en ESDT "+NETWORKS[bc.network_name]["identifier"]+" pour " + acc)
            bc.transferESDT(idx=NETWORKS[bc.network_name]["identifier"],
                                user_from=bc.bank,
                                user_to=_test.address.bech32(),
                                amount=data["amount"] * (10 ** 25)
                                )
            rc.append(acc)

    return jsonify({"message":"reloaded","account":rc})



@app.route('/api/clone/<token_id>/<network>/',methods=["POST"])
def clone(token_id:str,network:str):
    data = json.loads(str(request.data, encoding="utf-8"))
    _user = bc.get_elrond_user(data["pem"])
    if network=="db":
        tokenids=dao.clone(int(data["nb_copies"]),int(token_id))
    else:
        tokenids=bc.clone(_user,int(data["nb_copies"]),_user,int(token_id))

    send(socketio,"refresh_nft",_user.address.bech32())
    return jsonify(tokenids),200




@app.route('/api/new_dealer/',methods=["POST"])
def new_dealer(data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    _user=bc.get_elrond_user(data["pem"])
    tx=bc.execute(NETWORKS[bc.network_name]["nft"], _user,function="newdealer", arguments=[])

    tx = bc.add_miner(NETWORKS[bc.network_name]["nft"], _user, ["0x" + _user.address.hex()])

    return jsonify(tx), 200



@app.route('/api/add_dealer/<token_ids>/',methods=["POST"])
def add_dealer(token_ids:str,data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    for dealer in data["dealers"]:
        _dealer = Account(address=dealer["address"])
        arguments = [list_to_vec(token_ids.split(",")), "0x" + _dealer.address.hex(),"0",data["max_markup"]]
        tx = bc.add_dealer(NETWORKS[bc.network_name]["nft"], bc.get_elrond_user(data["pem"]), arguments)

    return jsonify(tx), 200




@app.route('/api/miners/<seller>/',methods=["GET"])
def get_miners(seller:str):
    miners = bc.miners(seller)
    return jsonify(miners), 200


#http://localhost:6660/api/dealers/
@app.route('/api/dealers/',methods=["GET"])
@app.route('/api/dealers/<addr>/',methods=["GET"])
def get_dealers(addr:str=ZERO_ADDR):
    rc=[]
    for dealer in bc.dealers(addr):
        _dealer=bc.get_account(dealer["address"]) | dealer
        rc.append(_dealer)
    return jsonify(rc), 200


@app.route('/api/ask_ref/<addr_from>/<addr_to>/',methods=["GET"])
def ask_ref(addr_from:str,addr_to:str):
    _dealer=bc.get_elrond_user(addr_to)
    _creator=bc.get_elrond_user(addr_from)

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
    tx=bc.dealer_state(bc.get_elrond_user(data["pem"]), int(state))

    if not tx is None and tx["status"]=="success":
        return jsonify({"message":"ok"}), 200
    else:
        return jsonify({"message": "Problème technique"}), 501


@app.route('/api/add_miner/',methods=["POST"])
def add_miner(data:dict=None):
    data=json.loads(str(request.data, encoding="utf-8"))
    _dealer=bc.get_elrond_user(data)
    _profil_dealer=bc.get_account(_dealer.address.bech32())
    _profil_miner=bc.get_account(data["address"])

    miners = bc.miners(_dealer.address.bech32())
    if data["address"] in [x["addr"] for x in miners]:
        return returnError("Vous avez déjà référencé ce createur")


    if not "pseudo" in _profil_miner or len(_profil_miner["pseudo"])==0:
        return jsonify({"error":"Le créateur doit au moins avoir un pseudo"}),500

    if "email" in _profil_miner:
        send_mail(open_html_file("informe_ref",{
            "dest":_profil_miner["pseudo"],
            "from":_profil_dealer["shop_name"]
        }),_profil_miner["email"],subject="Vous venez d'être référencé")


    tx=bc.add_miner(NETWORKS[bc.network_name]["nft"],_dealer, ["0x" + _profil_miner["hex_addr"]])

    return jsonify(tx), 200



@app.route('/api/del_miner/',methods=["POST"])
def del_miner(data:dict=None):
    if data is None:
        data = json.loads(str(request.data, encoding="utf-8"))

    _miner = Account(address=data["address"])
    tx=bc.execute(NETWORKS[bc.network_name]["nft"],bc.get_elrond_user(data["pem"]),"delminer",["0x" + _miner.address.hex()])

    return jsonify(tx), 200




@app.route('/api/deploy/<name>/<unity>/<nbdec>/<amount>/',methods=["POST"])
def deployESDT(name:str,unity:str,nbdec:str,amount:str,data:dict=None):
    log("Appel du service de déploiement d'ESDT de nom="+name+" unite="+unity)

    if data is None:
        data = str(request.data, encoding="utf-8")
        log("Les données de fabrication de la monnaie sont "+data)
        data = json.loads(data)

    log("Vérification de l'unicité du nom")
    if data["public"] and not dao.get_money_by_name(unity,bc._proxy.url) is None:
        return jsonify({"message": "Cette monnaie 'public' existe déjà"}), 500

    owner=bc.get_elrond_user(data["pem"])
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
@cache.cached(timeout=3600)
def server_config():
    log("Récupération de la configuration du server avec la bank "+bc.bank.address.bech32())

    profils = [
        {"label": "Alice", "value": "alice.pem"},
        {"label": "Eve", "value": "eve.pem"},
        {"label": "Dan", "value": "dan.pem"},
        {"label": "Grace", "value": "grace.pem"},
        {"label": "Franck", "value": "franck.pem"},
        {"label": "Ivan", "value": "ivan.pem"},
        {"label": "Mallory", "value": "mallory.pem"},
        {"label": "Judy", "value": "judy.pem"},
        {"label": "Thomas", "value": "thomas.pem"},
        {"label": "Herve", "value": "herve.pem"},
        {"label": "Test1", "value": "test1.pem"},
        {"label": "Test2", "value": "test2.pem"},
        {"label": "Test3", "value": "test3.pem"},
        {"label": "Test4", "value": "test4.pem"}
    ]

    infos = {
        "bank_addr": bc.bank.address.bech32(),
        "proxy": bc._proxy.url,
        "network":bc.network_name,
        "profils":profils,
        "appname":APPNAME,
        "reload_amount":NETWORKS[bc.network_name]["new_account"],
        "new_esdt_price":ESDT_PRICE/1e18,
        "nft_contract": NETWORKS[bc.network_name]["nft"],
        "domain_appli":DOMAIN_APPLI,
        "esdt_contract": ESDT_CONTRACT,
        "bank_gas":bc._proxy.get_account_balance(bc.bank.address),
        "explorer":bc._proxy.url.replace("-gateway","-explorer"),
        "contract_explorer": bc._proxy.url.replace("-api", "-explorer")+"/address/"+NETWORKS[bc.network_name]["nft"],
        "wallet": bc._proxy.url.replace("-gateway", "-wallet")+"/unlock/pem",
        "wallet_domain": bc._proxy.url.replace("-gateway","-wallet") +"/",
        "faucet":NETWORKS[bc.network_name]["faucet"]
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




@app.route('/api/contacts/<addr>/',methods=["GET"])
def get_contacts(addr:str):
    rows=bc.get_account(addr)
    rc = []
    for row in rows["contacts"].split(","):
        _info=bc.get_account(row)
        rc.append({"pseudo": _info["pseudo"], "addr":_info["addr"]})
    return jsonify(rc)




@app.route('/api/money/<idx>/',methods=['DELETE'])
def del_money(idx:str):
    dao.del_contract(idx,bc._proxy.url)
    return jsonify({"message":"monnaie dé"})




@app.route('/api/find_contact/<email>/')
@cache.cached(timeout=3600)
def find_contact(email:str):
    contact=bc.get_elrond_user(email)
    return jsonify(contact),201



@app.route('/api/contacts/',methods=["POST"])
def add_contact():
    _data=json.loads(str(request.data,"utf-8"))

    if "@" in _data["email"]:
        _contact,pem=bc.create_account(fund=NETWORKS[bc.network_name]["new_account"],email=_data["email"])
        _infos = bc.get_shard(_contact.address.bech32())
        addr_to_add=_contact.address.bech32()
    else:
        addr_to_add=_data["email"]

    _u=bc.get_elrond_user(_data)
    bc.add_contact(_u, addr_to_add)
    return jsonify({"addr":_data["email"],"email":_data["email"]})



    #on fait le choix de ne pas enregistrer les contacts dans la blockchain
    #bc.update_account(get_elrond_user(_data),{"contacts":_owner["contacts"]})
    del _contact["_id"]
    del _contact["pem"]
    return jsonify(_contact)



#test http://localhost:5555/api/balance/erd1qqqqqqqqqqqqqpgqqvtq3xx0pgnehaynt6flzp8hyc0ckahf9e3se00ejh/erd1jgffp69cxeqqzvrv3u96da6lqwx5d6d6e7j9uau3dv84e34vwq4q3gzjxl/
@app.route('/api/balance/<addr>/')
@cache.cached(timeout=30)
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
@cache.cached(timeout=3600*24)
def getyaml(name):
    f=open("./static/"+name+".yaml","r",encoding="utf-8")
    try:
        rc=yaml.safe_load(f.read())
    except Exception as inst:
        return returnError("Probleme de format du fichier "+name+" "+str(inst.args))

    return jsonify(rc),200


@app.route('/api/new_account/')
def new_account():
    email=request.args.get("email")
    _user=bc.get_elrond_user(email)
    if _user is None:
        _a,pem=bc.create_account(NETWORKS[bc.network_name]["new_account"],email=email)
        _infos=bc.get_shard(_a.address.bech32())

        log("Création du compte " + _a.address.bech32() + ". Demande de transfert de la monnaie par defaut")
        bSave, pem = dao.save_pem(_a.address.bech32(), pem)
        instant_access = app.config["DOMAIN_APPLI"] + "/?instant_access=" + str(pem,"utf8") + "&address=" + _a.address.bech32()
        private = _a.secret_key

        filename=email.split("@")[0].replace(".","_")+".xpem"
        send_mail(open_html_file("new_account",{
            "dest":email,
            "instant_access":instant_access,
            "public_key":_a.address.bech32(),
            "pem":_a.secret_key
        }),email,subject="Ouverture de votre compte",attach=pem,filename=filename)


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
        "pem": str(pem,"utf8"),
        "default_money":NETWORKS[bc.network_name]["identifier"],
        "default_name": NETWORKS[bc.network_name]["unity"]
    })

    return jsonify(rc),200



@app.route('/api/moneys/<addr>/')
@app.route('/api/moneys/')
@cache.cached(timeout=10)
def getmoneys(addr:str=""):
    """
    get_moneys
    récupération des /esdt
    test:
    :param addr:
    :return:
    """
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


@app.route('/api/raznftdb/<password>/')
def raznftdb(password:str):
    log("Demande d'effacement de la base")
    if password!="hh4271":return "Password incorrect",501
    dao.raz_nft()
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

