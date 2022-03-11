import base64
import json

import requests

NFT_SETTINGS={
    "elrond":{
        "doc":"",
        "network":"elrond",
        "domain":"gateway.elrond.com",
        "from_owner":"https://{{domain}}/address/{{owner}}/esdt",
        "all_nft":""
    },
    "solana":{
        "doc":"https://docs.solana.com/developing/clients/jsonrpc-api#gettokenaccountsbyowner",
        "network":"solana",
        "domain":"",
        "from_owner":"",
        "all_nft":""
    },
    "nfluent":{
        "network":"elrond",
        "from_owner":"https://{{server}}/",
        "all_nft":""
    }
}

class NFTSearchEngine:

    def __init__(self,network="elrond"):
        pass

    def find_sc_from(self,addr):
        if addr.startswith("Bj"):return "solana"
        return ""

    def prepare_url(self,url,owner=""):
        settings=NFT_SETTINGS[self.sc]
        url=url.replace("{{domain}}",settings["domain"]).replace("{{owner}}",owner)
        return url

    #Voir la documentation https://docs.elrond.com/developers/esdt-tokens/#get-all-esdt-tokens-for-an-address
    def query(self,owner="",creator="",collection="",prefix=""):
        if len(owner)>0:
            self.sc = self.find_sc_from(owner)
            url=self.prepare_url(NFT_SETTINGS[self.sc]["from_owner"])
        else:
            url = self.prepare_url(NFT_SETTINGS[self.sc]["all_nft"])
            

        rc=[]
        _data = requests.get(url).json()["data"]
        for item in _data["esdts"].values():
            bAdd=True
            if "creator" in item:
                if len(creator)>0 and item["creator"]!=creator: bAdd=False
                if bAdd:
                    item["owner"]=owner
                    l_prop=list()
                    for prop in str(base64.b64decode(item["attributes"]),"utf8").split(";"):
                        prop="\""+prop.replace(":","\":\"",1)+"\""
                        l_prop.append(prop)

                    s="{"+",".join(l_prop)+"}"
                    try:
                        item["properties"]=json.loads(s)
                    except:
                        item["properties"]=s

                    rc.append(item)

        return rc
