import base64
import json

import requests

NFT_NETWORKS={
    "elrond":{
        "domain":"gateway.elrond.com"
    }
}

class NFTSearchEngine:

    def __init__(self,network="elrond"):
        self.network=network

    #Voir la documentation https://docs.elrond.com/developers/esdt-tokens/#get-all-esdt-tokens-for-an-address
    def query(self,owner="",creator="",collection="",prefix=""):
        if len(owner)>0:
            url = "https://" + NFT_NETWORKS[self.network]["domain"] + "/address/" + owner + "/esdt"
        else:
            url = "https://" + NFT_NETWORKS[self.network]["domain"] + "/network/esdts"
            

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
